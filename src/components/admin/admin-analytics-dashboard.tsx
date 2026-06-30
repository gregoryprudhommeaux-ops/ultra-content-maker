"use client";

import { CreationModePieChart, KpiCard, UsageBarChart } from "@/components/admin/analytics-charts";
import { UsersMetricsTable } from "@/components/admin/users-metrics-table";
import { useAuth } from "@/components/auth/auth-provider";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { aggregateAdminStats } from "@/lib/admin/filter-admin-stats";
import { ARTICLE_CREATION_MODES } from "@/lib/articles/infer-creation-mode";
import type {
  AdminAnalyticsPayload,
  ConnectionGranularity,
} from "@/lib/admin/analytics.server";
import {
  DashboardPageError,
  DashboardPageHero,
  DashboardPageLoading,
  DashboardPageShell,
} from "@/components/layout/dashboard-page";
import { getClientAuth } from "@/lib/firebase/client";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

const PERIODS: ConnectionGranularity[] = ["day", "week", "month", "year"];

export function AdminAnalyticsDashboard() {
  const t = useTranslations("adminAnalytics");
  const tModes = useTranslations("setup.articles.create.intentSummary.modes");
  const { user } = useAuth();
  const isPlatformAdmin = usePlatformAdmin();
  const router = useRouter();
  const [period, setPeriod] = useState<ConnectionGranularity>("day");
  const [data, setData] = useState<AdminAnalyticsPayload | null>(null);
  const [includedUserIds, setIncludedUserIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) {
        setError(t("errors.notAuthenticated"));
        return;
      }
      const res = await fetch("/api/admin/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        router.replace("/articles/new");
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null;
        const code = body?.error ?? `http_${res.status}`;
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
      setIncludedUserIds(new Set(json.users.map((row) => row.userId)));
    } catch {
      setError(t("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [user, router, t]);

  useEffect(() => {
    if (!isPlatformAdmin) {
      router.replace("/articles/new");
      return;
    }
    void load();
  }, [isPlatformAdmin, load, router]);

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

  const buckets = data.connections[period];
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
            onClick={() => void load()}
            className="rounded-lg border border-ns-alternate bg-white px-4 py-2 text-sm font-semibold text-ns-hero hover:border-ns-primary"
          >
            {t("refresh")}
          </button>
        }
      />

      {statsScopeHint ? (
        <p className="text-sm font-medium text-ns-secondary">{statsScopeHint}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
          tone="warning"
          label={t("kpis.draftArticles")}
          value={filteredTotals.draftArticles}
        />
        <KpiCard
          tone="neutral"
          label={t("kpis.reworkedArticles")}
          value={filteredTotals.reworkedArticles}
        />
        <KpiCard
          tone="primary"
          label={t("kpis.totalArticles")}
          value={filteredTotals.totalArticles}
        />
      </div>

      <UsersMetricsTable
        users={data.users}
        currentAdminUserId={user?.uid ?? ""}
        includedUserIds={includedUserIds}
        onToggleIncluded={onToggleIncluded}
        onUserDeleted={() => void load()}
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
        }}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  period === key
                    ? "bg-ns-hero text-white shadow-sm"
                    : "border border-ns-alternate bg-white text-ns-secondary hover:border-ns-primary hover:text-ns-hero"
                }`}
              >
                {t(`periods.${key}`)}
              </button>
            ))}
          </div>

          <UsageBarChart
            title={t("connections.title")}
            subtitle={t(`connections.subtitle.${period}`)}
            emptyLabel={t("connections.empty")}
            buckets={buckets}
            accentClass="bg-ns-primary"
          />
        </section>

        <CreationModePieChart
          title={t("articleModes.title")}
          subtitle={t("articleModes.subtitle")}
          emptyLabel={t("articleModes.empty")}
          totalLabel={t("articleModes.totalLabel")}
          slices={modeSlices}
        />
      </div>

      <p className="text-xs text-ns-secondary">
        {t("footnote")}{" "}
        <Link href="/articles/new" className="font-semibold text-ns-primary hover:underline">
          {t("backToApp")}
        </Link>
      </p>
    </DashboardPageShell>
  );
}
