"use client";

import { CreationModePieChart, KpiCard, OnboardingFunnelChart, UsageBarChart } from "@/components/admin/analytics-charts";
import { UsersMetricsTable } from "@/components/admin/users-metrics-table";
import { AdminBillingHub } from "@/components/admin/admin-billing-hub";
import { AdminTierMixBar } from "@/components/admin/admin-tier-mix-bar";
import {
  AdminCockpitSection,
  AdminCockpitTabBar,
  AdminKpiGroup,
  type AdminCockpitTab,
} from "@/components/admin/admin-cockpit-layout";
import { useAuth } from "@/components/auth/auth-provider";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import {
  applyAdminFilterPreset,
  countUsersForPreset,
  usersToCsv,
  type AdminFilterPreset,
} from "@/lib/admin/admin-filter-presets";
import { aggregateAdminStats, computeRevenueSummary, filterConnectionBuckets, listBlockedUsers } from "@/lib/admin/filter-admin-stats";
import type { ErrorReportRow } from "@/lib/admin/error-reports.server";
import type { WireRequestRow } from "@/lib/billing/wire-requests.server";
import type { SupportQuoteRow } from "@/lib/admin/support-quotes.server";
import { computeOnboardingFunnel } from "@/lib/admin/onboarding-funnel";
import { ARTICLE_CREATION_MODES } from "@/lib/articles/infer-creation-mode";
import type {
  AdminAnalyticsPayload,
  ConnectionGranularity,
} from "@/lib/admin/analytics-types";
import type { SupportProductionStatus } from "@/types/workspace";
import type { SubscriptionTier } from "@/types/subscription";
import { CONNECTION_PERIOD_KEYS } from "@/lib/admin/analytics-types";
import {
  DashboardPageError,
  DashboardPageHero,
  DashboardPageLoading,
  DashboardPageShell,
} from "@/components/layout/dashboard-page";
import { getClientAuth } from "@/lib/firebase/client";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BTN_SECONDARY } from "@/lib/ui/nextstep";
import { useCallback, useEffect, useMemo, useState, Fragment } from "react";

const PERIODS = CONNECTION_PERIOD_KEYS;
const FILTER_PRESETS: AdminFilterPreset[] = [
  "product",
  "trial",
  "paying",
  "blocked",
  "support",
];

const PRODUCTION_STATUSES: SupportProductionStatus[] = [
  "to_produce",
  "client_review",
  "published",
];

const COCKPIT_TABS: AdminCockpitTab[] = [
  "overview",
  "actions",
  "support",
  "users",
  "billing",
];

function parseCockpitTab(value: string | null): AdminCockpitTab {
  if (value && COCKPIT_TABS.includes(value as AdminCockpitTab)) {
    return value as AdminCockpitTab;
  }
  return "overview";
}

function supportTierLabel(
  tier: string,
  labels: { supportStarter: string; supportRegular: string; supportTotal: string },
): string {
  if (tier === "support_starter") return labels.supportStarter;
  if (tier === "support_regular") return labels.supportRegular;
  return labels.supportTotal;
}

function deliveryStatusClass(status: string): string {
  if (status === "on_track") return "bg-emerald-100 text-emerald-900";
  if (status === "at_risk") return "bg-amber-100 text-amber-900";
  return "bg-rose-100 text-rose-900";
}

export function AdminAnalyticsDashboard() {
  const t = useTranslations("adminAnalytics");
  const tModes = useTranslations("setup.articles.create.intentSummary.modes");
  const { user } = useAuth();
  const isPlatformAdmin = usePlatformAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<AdminCockpitTab>(() =>
    parseCockpitTab(searchParams.get("tab")),
  );
  const [period, setPeriod] = useState<ConnectionGranularity>("day");
  const [data, setData] = useState<AdminAnalyticsPayload | null>(null);
  const [includedUserIds, setIncludedUserIds] = useState<Set<string>>(() => new Set());
  const [errorReports, setErrorReports] = useState<ErrorReportRow[]>([]);
  const [wireRequests, setWireRequests] = useState<WireRequestRow[]>([]);
  const [supportQuotes, setSupportQuotes] = useState<SupportQuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSupportId, setExpandedSupportId] = useState<string | null>(null);
  const [productionFilter, setProductionFilter] = useState<
    SupportProductionStatus | "all"
  >("all");
  const [activePreset, setActivePreset] = useState<AdminFilterPreset | null>(null);

  const fetchWithAuth = useCallback(
    async (path: string) => {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) {
        throw new Error("not_authenticated");
      }
      return fetch(path, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    [],
  );

  const load = useCallback(
    async (options?: { refresh?: boolean }) => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const refresh = options?.refresh ? "&refresh=1" : "";
        const res = await fetchWithAuth(
          `/api/admin/analytics?scope=overview&connectionPeriod=day${refresh}`,
        );
        if (res.status === 403) {
          router.replace("/articles/new");
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
            detail?: string;
          } | null;
          const code = body?.error ?? `http_${res.status}`;
          if (code === "admin_not_configured") {
            setError(t("errors.adminNotConfigured"));
            return;
          }
          const detail = body?.detail?.trim();
          setError(
            detail
              ? `${t("errors.loadFailed")} (${code}: ${detail})`
              : `${t("errors.loadFailed")} (${code})`,
          );
          return;
        }
        const json = (await res.json()) as AdminAnalyticsPayload;
        setData(json);
        const defaultIncluded = new Set(
          json.users.filter((row) => !row.excludeFromStatsDefault).map((row) => row.userId),
        );
        setIncludedUserIds(defaultIncluded);
      } catch (err) {
        if (err instanceof Error && err.message === "not_authenticated") {
          setError(t("errors.notAuthenticated"));
        } else {
          setError(t("errors.loadFailed"));
        }
      } finally {
        setLoading(false);
      }
    },
    [user, router, t, fetchWithAuth],
  );

  const loadConnectionsForPeriod = useCallback(
    async (targetPeriod: ConnectionGranularity) => {
      if (!user) return;

      setLoadingConnections(true);
      try {
        const res = await fetchWithAuth(
          `/api/admin/analytics?scope=connections&connectionPeriod=${targetPeriod}`,
        );
        if (!res.ok) return;
        const json = (await res.json()) as {
          connections: Partial<AdminAnalyticsPayload["connections"]>;
        };
        const buckets = json.connections[targetPeriod];
        if (!buckets?.length) return;
        setData((prev) => {
          if (!prev || prev.connections[targetPeriod]?.length) return prev;
          return {
            ...prev,
            connections: {
              ...prev.connections,
              [targetPeriod]: buckets,
            },
          };
        });
      } catch {
        /* chart can stay empty until retry */
      } finally {
        setLoadingConnections(false);
      }
    },
    [user, fetchWithAuth],
  );

  const loadErrorReports = useCallback(async () => {
    if (!user) return;
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) return;
      const res = await fetch("/api/admin/error-reports", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = (await res.json()) as { reports: ErrorReportRow[] };
      setErrorReports(json.reports ?? []);
    } catch {
      /* inbox is optional */
    }
  }, [user]);

  const loadWireRequests = useCallback(async () => {
    if (!user) return;
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) return;
      const res = await fetch("/api/admin/wire-requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = (await res.json()) as { requests: WireRequestRow[] };
      setWireRequests(json.requests ?? []);
    } catch {
      /* badge count is optional */
    }
  }, [user]);

  const loadSupportQuotes = useCallback(async () => {
    if (!user) return;
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) return;
      const res = await fetch("/api/admin/support-quotes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = (await res.json()) as { quotes: SupportQuoteRow[] };
      setSupportQuotes(json.quotes ?? []);
    } catch {
      /* badge count is optional */
    }
  }, [user]);

  useEffect(() => {
    const tabFromUrl = parseCockpitTab(searchParams.get("tab"));
    setActiveTab(tabFromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (!isPlatformAdmin) {
      router.replace("/articles/new");
      return;
    }
    void load();
    void loadErrorReports();
    void loadWireRequests();
    void loadSupportQuotes();
  }, [isPlatformAdmin, load, loadErrorReports, loadWireRequests, loadSupportQuotes, router]);

  useEffect(() => {
    if (!isPlatformAdmin || !data) return;
    void loadConnectionsForPeriod(period);
  }, [isPlatformAdmin, data, period, loadConnectionsForPeriod]);

  const users = data?.users ?? [];
  const filteredTotals = useMemo(
    () => aggregateAdminStats(users, includedUserIds),
    [users, includedUserIds],
  );
  const modeSlices = useMemo(
    () =>
      ARTICLE_CREATION_MODES.map((mode) => ({
        mode,
        label: tModes(mode),
        count: filteredTotals.articleModeCounts[mode],
      })),
    [filteredTotals.articleModeCounts, tModes],
  );
  const filteredConnections = useMemo(
    () => filterConnectionBuckets(data?.connections[period] ?? [], includedUserIds),
    [data?.connections, period, includedUserIds],
  );
  const revenue = useMemo(
    () =>
      computeRevenueSummary(
        users,
        includedUserIds,
        data?.llmUsage.platformCostUsd ?? 0,
      ),
    [users, includedUserIds, data?.llmUsage.platformCostUsd],
  );
  const blockedUsers = useMemo(
    () =>
      listBlockedUsers(users, includedUserIds, {
        blocked: t("blocked.reasonBlocked"),
        lowCompletion: t("blocked.reasonLowCompletion"),
      }),
    [users, includedUserIds, t],
  );
  const funnel = useMemo(
    () => computeOnboardingFunnel(users, includedUserIds),
    [users, includedUserIds],
  );
  const funnelSteps = useMemo(
    () =>
      funnel.steps.map((step) => ({
        ...step,
        label: t(`funnel.steps.${step.key}`),
      })),
    [funnel.steps, t],
  );
  const openErrorReports = errorReports.filter((r) => r.status === "open");
  const pendingWireCount = wireRequests.filter(
    (r) => r.status === "pending" || r.status === "wire_sent",
  ).length;
  const newSupportQuotesCount = supportQuotes.filter((q) => q.status === "new").length;
  const actionsBadge = blockedUsers.length + openErrorReports.length;
  const billingBadge = pendingWireCount + newSupportQuotesCount;

  const tierLabels = useMemo(
    () =>
      ({
        free_test: t("tiers.freeTest"),
        pro: t("tiers.pro"),
        pro_plus: t("tiers.proPlus"),
        support_starter: t("tiers.supportStarter"),
        support_regular: t("tiers.supportRegular"),
        support_total: t("tiers.supportTotal"),
        full_free: t("tiers.fullFree"),
        free_without_api: t("tiers.freeWithoutApi"),
        expired: t("tiers.expired"),
      }) satisfies Record<SubscriptionTier, string>,
    [t],
  );

  const filteredSupportAccounts = useMemo(() => {
    const accounts = data?.supportAccounts ?? [];
    if (productionFilter === "all") return accounts;
    return accounts.filter(
      (row) => row.productionThisMonth[productionFilter] > 0,
    );
  }, [data?.supportAccounts, productionFilter]);

  const productionTotals = data?.supportProductionTotals ?? {
    to_produce: 0,
    client_review: 0,
    published: 0,
  };
  const hasProductionActivity =
    productionTotals.to_produce +
      productionTotals.client_review +
      productionTotals.published >
    0;

  function onApplyPreset(preset: AdminFilterPreset) {
    if (!data) return;
    setIncludedUserIds(applyAdminFilterPreset(data.users, preset));
    setActivePreset(preset);
  }

  function renderFilterPresets(showExport = false) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ns-secondary">
          {t("filterPresets.label")}
        </span>
        {FILTER_PRESETS.map((preset) => {
          const count = data ? countUsersForPreset(data.users, preset) : 0;
          const isActive = activePreset === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onApplyPreset(preset)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? "border-ns-primary bg-ns-primary text-black shadow-sm"
                  : "border-ns-alternate bg-white text-ns-secondary hover:border-ns-primary hover:text-ns-hero"
              }`}
            >
              {t(`filterPresets.${preset}`)}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  isActive ? "bg-black/15 text-black" : "bg-ns-brand-light text-ns-tertiary"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
        {showExport ? (
          <button
            type="button"
            onClick={onExportCsv}
            className={`ml-auto ${BTN_SECONDARY} !min-h-9 !px-3 !py-1.5 text-xs`}
          >
            {t("exportCsv")}
          </button>
        ) : null}
      </div>
    );
  }

  function onExportCsv() {
    if (!data) return;
    const csv = usersToCsv(data.users, includedUserIds, {
      email: t("usersTable.email"),
      displayName: t("usersTable.name"),
      tier: t("usersTable.tier"),
      completionPercent: t("usersTable.completion"),
      validatedArticles: t("usersTable.validated"),
      postsRemaining: t("usersTable.postsRemaining"),
      blockReason: t("usersTable.blockReason"),
      draftArticles: t("usersTable.drafts"),
      totalArticles: t("usersTable.totalArticles"),
      lastLoginAt: t("usersTable.lastLogin"),
      createdAt: t("usersTable.createdAt"),
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ucm-users-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function onResolveReport(reportId: string) {
    if (!user) return;
    const auth = getClientAuth();
    const token = auth ? await auth.currentUser?.getIdToken() : null;
    if (!token) return;
    const res = await fetch("/api/admin/error-reports", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reportId, status: "resolved" }),
    });
    if (res.ok) void loadErrorReports();
  }

  function onTabChange(tab: AdminCockpitTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.replace(qs ? `/admin/analytics?${qs}` : "/admin/analytics", { scroll: false });
  }

  function onToggleIncluded(userId: string, included: boolean) {
    setIncludedUserIds((prev) => {
      const next = new Set(prev);
      if (included) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }

  if (!isPlatformAdmin) {
    return null;
  }

  if (!data && loading) {
    return (
      <DashboardPageShell>
        <DashboardPageLoading>{t("loading")}</DashboardPageLoading>
      </DashboardPageShell>
    );
  }

  if (error) {
    return (
      <DashboardPageShell>
        <DashboardPageError
          message={error}
          onRetry={() => void load()}
          retryLabel={t("retry")}
        />
      </DashboardPageShell>
    );
  }

  if (!data) return null;

  const statsScopeHint =
    includedUserIds.size < data.users.length
      ? t("statsScope.filtered", {
          included: includedUserIds.size,
          total: data.users.length,
        })
      : null;

  return (
    <DashboardPageShell>
      <DashboardPageHero
        variant="gradient"
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        note={
          <p className="mt-2 text-xs font-medium text-ns-alternate">
            {t("generatedAt", {
              date: new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(data.generatedAt)),
            })}
          </p>
        }
        actions={
          <button
            type="button"
            onClick={() => void load({ refresh: true })}
            className="rounded-lg border border-ns-alternate bg-white px-4 py-2 text-sm font-semibold text-ns-hero hover:border-ns-primary"
          >
            {t("refresh")}
          </button>
        }
      />

      <AdminCockpitTabBar
        tabs={[
          { id: "overview", label: t("tabs.overview") },
          { id: "actions", label: t("tabs.actions"), badge: actionsBadge },
          { id: "support", label: t("tabs.support") },
          { id: "users", label: t("tabs.users") },
          { id: "billing", label: t("tabs.billing"), badge: billingBadge },
        ]}
        active={activeTab}
        onChange={onTabChange}
      />

      {activeTab === "overview" ? (
        <div className="space-y-6">
          {statsScopeHint ? (
            <p className="text-sm font-medium text-ns-secondary">{statsScopeHint}</p>
          ) : null}

          {activePreset ? (
            <p className="text-sm font-medium text-ns-hero">
              {t("filterPresets.active", {
                label: t(`filterPresets.${activePreset}`),
                count: includedUserIds.size,
              })}
            </p>
          ) : null}

          {renderFilterPresets(true)}

          <AdminTierMixBar
            counts={revenue.countByTier}
            labels={tierLabels}
            title={t("tierMix.title")}
            subtitle={statsScopeHint ?? t("tierMix.subtitleAll")}
          />

          <div className="space-y-3">
            <AdminKpiGroup title={t("kpiGroups.product")} columns="6">
              <KpiCard
                tone="primary"
                label={t("kpis.registeredUsers")}
                value={filteredTotals.registeredUsers}
              />
              <KpiCard
                tone="secondary"
                label={t("kpis.workspaceAccounts")}
                value={filteredTotals.workspaceAccounts}
              />
              <KpiCard
                tone="success"
                label={t("kpis.avgCompletion")}
                value={`${filteredTotals.averageCompletionPercent}%`}
              />
              <KpiCard
                tone="primary"
                label={t("kpis.validatedArticles")}
                value={filteredTotals.validatedArticles}
              />
              <KpiCard
                tone="warning"
                label={t("kpis.draftArticles")}
                value={filteredTotals.draftArticles}
              />
              <KpiCard
                tone="neutral"
                label={t("kpis.reworkedArticles")}
                value={filteredTotals.reworkedArticles}
              />
            </AdminKpiGroup>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <AdminKpiGroup title={t("kpiGroups.revenue")} columns="3">
                <KpiCard
                  tone="success"
                  label={t("kpis.mrr")}
                  value={`$${revenue.mrrUsd}`}
                />
                <KpiCard
                  tone="neutral"
                  label={t("kpis.estimatedMargin")}
                  value={`$${revenue.estimatedGrossMarginUsd.toFixed(2)}`}
                />
                <KpiCard
                  tone="primary"
                  label={t("kpis.stripeMrr")}
                  value={`$${revenue.stripeMrrUsd}`}
                  hint={t("kpis.stripeSubscribers", { count: revenue.stripeSubscribers })}
                />
              </AdminKpiGroup>

              <AdminKpiGroup title={t("kpiGroups.costs")} columns="3">
                <KpiCard
                  tone="warning"
                  label={t("kpis.estimatedLlmCost")}
                  value={`$${revenue.estimatedLlmCostUsd.toFixed(2)}`}
                />
                <KpiCard
                  tone="neutral"
                  label={t("kpis.loggedLlmCost")}
                  value={`$${revenue.loggedPlatformLlmCostUsd.toFixed(2)}`}
                />
              </AdminKpiGroup>
            </div>
          </div>

          <OnboardingFunnelChart
            title={t("funnel.title")}
            subtitle={t("funnel.subtitle")}
            emptyLabel={t("funnel.empty")}
            registered={funnel.registered}
            steps={funnelSteps}
          />

          <AdminCockpitSection
            title={t("sections.charts")}
            subtitle={t("sections.chartsSubtitle")}
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <UsageBarChart
                title={t("connections.title")}
                subtitle={
                  loadingConnections && !filteredConnections.length
                    ? t("loading")
                    : t(`connections.subtitle.${period}`)
                }
                emptyLabel={t("connections.empty")}
                buckets={filteredConnections}
                accentClass="bg-ns-primary"
                headerRight={
                  <label className="flex items-center gap-2 text-xs font-semibold text-ns-secondary">
                    <span className="sr-only">{t("periods.label")}</span>
                    <select
                      value={period}
                      onChange={(event) =>
                        setPeriod(event.target.value as ConnectionGranularity)
                      }
                      aria-label={t("periods.label")}
                      className="max-w-[10rem] cursor-pointer rounded-lg border border-ns-alternate bg-white py-1.5 pl-2.5 pr-8 text-sm font-semibold text-ns-tertiary shadow-sm focus:border-ns-primary focus:outline-none focus:ring-2 focus:ring-ns-primary/30"
                    >
                      {PERIODS.map((key) => (
                        <option key={key} value={key}>
                          {t(`periods.${key}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                }
              />

              <CreationModePieChart
                title={t("articleModes.title")}
                subtitle={t("articleModes.subtitle")}
                emptyLabel={t("articleModes.empty")}
                totalLabel={t("articleModes.totalLabel")}
                slices={modeSlices}
              />
            </div>
          </AdminCockpitSection>
        </div>
      ) : null}

      {activeTab === "actions" ? (
        <div className="space-y-6">
          {blockedUsers.length > 0 ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
              <h3 className="text-base font-bold text-amber-950">{t("blocked.title")}</h3>
              <p className="mt-1 text-sm text-amber-900/90">{t("blocked.subtitle")}</p>
              <ul className="mt-4 space-y-2">
                {blockedUsers.slice(0, 10).map((row) => (
                  <li
                    key={row.userId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/80 bg-white px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-ns-hero">
                      {row.displayName ?? row.email}
                    </span>
                    <span className="text-xs text-amber-900">
                      {row.blockReason
                        ? t(`blocked.codes.${row.blockReason}`)
                        : row.stuckReason}
                      {row.postsRemaining != null ? ` · ${row.postsRemaining} ${t("blocked.postsLeft")}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {openErrorReports.length > 0 ? (
            <section className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 shadow-sm">
              <h3 className="text-base font-bold text-rose-950">{t("errorInbox.title")}</h3>
              <p className="mt-1 text-sm text-rose-900/90">{t("errorInbox.subtitle")}</p>
              <ul className="mt-4 space-y-2">
                {openErrorReports.slice(0, 8).map((report) => (
                  <li
                    key={report.id}
                    className="rounded-lg border border-rose-200/80 bg-white px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-ns-hero">
                          {report.surface} · {report.userEmail}
                        </p>
                        <p className="mt-0.5 text-xs text-ns-secondary">{report.userMessage}</p>
                        {report.userNote ? (
                          <p className="mt-1 text-xs text-ns-tertiary italic">{report.userNote}</p>
                        ) : null}
                        <p className="mt-1 text-[10px] text-ns-secondary">
                          {report.errorCode ?? "-"}
                          {report.createdAt
                            ? ` · ${new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(new Date(report.createdAt))}`
                            : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void onResolveReport(report.id)}
                        className="shrink-0 rounded-md border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-900 hover:bg-rose-100"
                      >
                        {t("errorInbox.resolve")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      {activeTab === "support" && data.supportAccounts.length > 0 ? (
        <section className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 shadow-sm">
          <h3 className="text-base font-bold text-violet-950">{t("supportCockpit.title")}</h3>
          <p className="mt-1 text-sm text-violet-900/90">{t("supportCockpit.subtitle")}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {PRODUCTION_STATUSES.map((status) => (
              <div
                key={status}
                className="rounded-xl border border-violet-200/80 bg-white/90 px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">
                  {t(`production.${status}`)}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-violet-950">
                  {productionTotals[status]}
                </p>
              </div>
            ))}
          </div>
          {!hasProductionActivity ? (
            <p className="mt-3 text-sm text-violet-800/80">{t("production.empty")}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-900">
              {t("supportCockpit.filterProduction")}
            </span>
            <button
              type="button"
              onClick={() => setProductionFilter("all")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                productionFilter === "all"
                  ? "bg-violet-700 text-white"
                  : "border border-violet-200 bg-white text-violet-900 hover:border-violet-400"
              }`}
            >
              {t("supportCockpit.filterAll")}
            </button>
            {PRODUCTION_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setProductionFilter(status)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  productionFilter === status
                    ? "bg-violet-700 text-white"
                    : "border border-violet-200 bg-white text-violet-900 hover:border-violet-400"
                }`}
              >
                {t(`production.${status}`)}
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-violet-200/80 text-xs uppercase tracking-wide text-violet-900">
                  <th className="px-3 py-2">{t("supportCockpit.account")}</th>
                  <th className="px-3 py-2">{t("supportCockpit.tier")}</th>
                  <th className="px-3 py-2">{t("supportCockpit.clients")}</th>
                  <th className="px-3 py-2">{t("supportCockpit.delivered")}</th>
                  <th className="px-3 py-2">{t("supportCockpit.monthlyQuota")}</th>
                  <th className="px-3 py-2">{t("supportCockpit.quota")}</th>
                  <th className="px-3 py-2">{t("supportCockpit.status")}</th>
                  <th className="px-3 py-2">{t("supportCockpit.margin")}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filteredSupportAccounts.map((row) => {
                  const expanded = expandedSupportId === row.userId;
                  return (
                    <Fragment key={row.userId}>
                      <tr
                        key={row.userId}
                        className="border-b border-violet-100/80 bg-white/80"
                      >
                        <td className="px-3 py-2 font-medium text-ns-hero">
                          {row.displayName ?? row.email}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {supportTierLabel(row.tier, {
                            supportStarter: t("tiers.supportStarter"),
                            supportRegular: t("tiers.supportRegular"),
                            supportTotal: t("tiers.supportTotal"),
                          })}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {row.linkedClients || row.ownedWorkspaces}
                        </td>
                        <td className="px-3 py-2 tabular-nums font-semibold text-emerald-800">
                          {row.deliveredThisMonth}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{row.monthlyQuota}</td>
                        <td className="px-3 py-2 tabular-nums">{row.remainingQuota}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${deliveryStatusClass(row.deliveryStatus)}`}
                          >
                            {t(`supportCockpit.deliveryStatus.${row.deliveryStatus}`)}
                          </span>
                        </td>
                        <td className="px-3 py-2 tabular-nums font-medium">
                          ${row.estimatedMarginUsd.toFixed(0)}
                          <span className="block text-[10px] font-normal text-violet-800/70">
                            {t("supportCockpit.revenue")} ${row.revenueUsd} ·{" "}
                            {t("supportCockpit.llmCost")} ${row.llmCostUsd.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSupportId(expanded ? null : row.userId)
                            }
                            className="text-xs font-semibold text-violet-800 hover:underline"
                          >
                            {expanded
                              ? t("supportCockpit.collapse")
                              : t("supportCockpit.expand")}
                          </button>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="bg-violet-50/50">
                          <td colSpan={9} className="px-3 py-3">
                            {row.workspaces.length === 0 ? (
                              <p className="text-sm text-violet-800">
                                {t("supportCockpit.noWorkspaces")}
                              </p>
                            ) : (
                              <table className="min-w-full text-left text-xs">
                                <thead>
                                  <tr className="text-violet-900">
                                    <th className="px-2 py-1">
                                      {t("supportCockpit.workspaceName")}
                                    </th>
                                    <th className="px-2 py-1">
                                      {t("supportCockpit.linkedClient")}
                                    </th>
                                    <th className="px-2 py-1">
                                      {t("supportCockpit.delivered")}
                                    </th>
                                    <th className="px-2 py-1">
                                      {t(`production.to_produce`)}
                                    </th>
                                    <th className="px-2 py-1">
                                      {t(`production.client_review`)}
                                    </th>
                                    <th className="px-2 py-1">
                                      {t(`production.published`)}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.workspaces.map((ws) => (
                                    <tr
                                      key={`${ws.ownerId}:${ws.accountId}`}
                                      className="border-t border-violet-100"
                                    >
                                      <td className="px-2 py-1 font-medium text-ns-hero">
                                        {ws.accountName}
                                      </td>
                                      <td className="px-2 py-1 text-ns-secondary">
                                        {ws.linkedClientDisplayName ??
                                          ws.linkedClientEmail ??
                                          "-"}
                                      </td>
                                      <td className="px-2 py-1 tabular-nums">
                                        {ws.validatedThisMonth}
                                      </td>
                                      <td className="px-2 py-1 tabular-nums">
                                        {ws.productionThisMonth.to_produce}
                                      </td>
                                      <td className="px-2 py-1 tabular-nums">
                                        {ws.productionThisMonth.client_review}
                                      </td>
                                      <td className="px-2 py-1 tabular-nums">
                                        {ws.productionThisMonth.published}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : activeTab === "support" ? (
        <p className="text-sm text-ns-secondary">{t("supportCockpit.empty")}</p>
      ) : null}

      {activeTab === "users" ? (
        <div className="space-y-4">
          {renderFilterPresets(true)}

          <UsersMetricsTable
        users={data.users}
        currentAdminUserId={user?.uid ?? ""}
        includedUserIds={includedUserIds}
        onToggleIncluded={onToggleIncluded}
        onUserDeleted={() => void load({ refresh: true })}
        onUserUpdated={() => void load({ refresh: true })}
        labels={{
          title: t("usersTable.title"),
          includeInStats: t("usersTable.includeInStats"),
          rank: t("usersTable.rank"),
          name: t("usersTable.name"),
          email: t("usersTable.email"),
          linkedin: t("usersTable.linkedin"),
          createdAt: t("usersTable.createdAt"),
          accounts: t("usersTable.accounts"),
          completion: t("usersTable.completion"),
          drafts: t("usersTable.drafts"),
          reworked: t("usersTable.reworked"),
          totalArticles: t("usersTable.totalArticles"),
          validated: t("usersTable.validated"),
          tier: t("usersTable.tier"),
          postsRemaining: t("usersTable.postsRemaining"),
          blockReason: t("usersTable.blockReason"),
          usage: t("usersTable.usage"),
          lastLogin: t("usersTable.lastLogin"),
          sortBy: t("usersTable.sortBy"),
          noLinkedin: t("usersTable.noLinkedin"),
          noDate: t("usersTable.noDate"),
          actions: t("usersTable.actions"),
          delete: t("usersTable.delete"),
          confirmDelete: t("usersTable.confirmDelete"),
          confirm: t("usersTable.confirm"),
          cancel: t("usersTable.cancel"),
          deleting: t("usersTable.deleting"),
          deleteSelf: t("usersTable.deleteSelf"),
          deleteFailed: t("usersTable.deleteFailed"),
          control: {
            control: t("usersTable.control.action"),
            takeover: t("usersTable.control.takeover"),
            confirmControl: t("usersTable.control.confirmControl"),
            confirmTakeover: t("usersTable.control.confirmTakeover"),
            controlling: t("usersTable.control.controlling"),
            controlSuccess: t("usersTable.control.controlSuccess"),
            release: t("usersTable.control.release"),
            confirmRelease: t("usersTable.control.confirmRelease"),
            releasing: t("usersTable.control.releasing"),
            releaseSuccess: t("usersTable.control.releaseSuccess"),
            openWorkspace: t("usersTable.control.openWorkspace"),
            managedByYou: t("usersTable.control.managedByYou"),
            managedByOther: t("usersTable.control.managedByOther"),
            cannotControlAdmin: t("usersTable.control.cannotControlAdmin"),
            cannotControlSelf: t("usersTable.control.cannotControlSelf"),
            controlFailed: t("usersTable.control.controlFailed"),
            controlErrors: {
              auth: t("usersTable.control.controlErrors.auth"),
              forbidden: t("usersTable.control.controlErrors.forbidden"),
              admin_not_configured: t("usersTable.control.controlErrors.admin_not_configured"),
              user_not_found: t("usersTable.control.controlErrors.user_not_found"),
              client_doc_missing: t("usersTable.control.controlErrors.client_doc_missing"),
              client_account_missing: t("usersTable.control.controlErrors.client_account_missing"),
              cannot_link_self: t("usersTable.control.controlErrors.cannot_link_self"),
              cannot_link_admin: t("usersTable.control.controlErrors.cannot_link_admin"),
              control_failed: t("usersTable.control.controlErrors.control_failed"),
            },
            confirm: t("usersTable.confirm"),
            cancel: t("usersTable.cancel"),
          },
          tierLabels: {
            free_test: t("tiers.freeTest"),
            pro: t("tiers.pro"),
            pro_plus: t("tiers.proPlus"),
            support_starter: t("tiers.supportStarter"),
            support_regular: t("tiers.supportRegular"),
            support_total: t("tiers.supportTotal"),
            full_free: t("tiers.fullFree"),
            free_without_api: t("tiers.freeWithoutApi"),
            expired: t("tiers.expired"),
          },
          blockCodes: {
            trial_expired: t("blocked.codes.trial_expired"),
            trial_posts_exhausted: t("blocked.codes.trial_posts_exhausted"),
            subscription_required: t("blocked.codes.subscription_required"),
            pro_cap: t("blocked.codes.pro_cap"),
            pro_plus_cap: t("blocked.codes.pro_plus_cap"),
            support_no_generate: t("blocked.codes.support_no_generate"),
            wire_payment_overdue: t("blocked.codes.wire_payment_overdue"),
          },
          noBlock: t("usersTable.noBlock"),
          onboardingSteps: {
            llm: t("funnel.steps.llm"),
            author: t("funnel.steps.author"),
            audience: t("funnel.steps.audience"),
            persona: t("funnel.steps.persona"),
            firstArticle: t("funnel.steps.firstArticle"),
            firstValidated: t("funnel.steps.firstValidated"),
            hint: t("usersTable.onboardingStepsHint"),
            complete: t("usersTable.onboardingComplete"),
            missingTitle: t("usersTable.onboardingMissing"),
            guideHint: t("usersTable.onboardingGuideHint"),
            hoverHint: t("usersTable.onboardingHoverHint"),
          },
          tierChange: {
            changeTier: t("usersTable.changeTier"),
            confirm: t("usersTable.tierConfirm"),
            cancel: t("usersTable.cancel"),
            saving: t("usersTable.tierSaving"),
            changeFailed: t("usersTable.tierChangeFailed"),
            filterAll: t("usersTable.tierFilterAll"),
            filterLabel: t("usersTable.tierFilterLabel"),
          },
        }}
          />
        </div>
      ) : null}

      {activeTab === "billing" ? <AdminBillingHub /> : null}

      <p className="text-xs text-ns-secondary">
        {t("footnote")}{" "}
        <Link href="/articles/new" className="font-semibold text-ns-primary hover:underline">
          {t("backToApp")}
        </Link>
      </p>
    </DashboardPageShell>
  );
}
