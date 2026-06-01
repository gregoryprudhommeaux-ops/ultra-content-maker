"use client";

import { KpiCard, UsageBarChart } from "@/components/admin/analytics-charts";
import { UsersMetricsTable } from "@/components/admin/users-metrics-table";
import { useAuth } from "@/components/auth/auth-provider";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
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
import { useCallback, useEffect, useState } from "react";

const PERIODS: ConnectionGranularity[] = ["day", "week", "month", "year"];

export function AdminAnalyticsDashboard() {
  const t = useTranslations("adminAnalytics");
  const { user } = useAuth();
  const isPlatformAdmin = usePlatformAdmin();
  const router = useRouter();
  const [period, setPeriod] = useState<ConnectionGranularity>("day");
  const [data, setData] = useState<AdminAnalyticsPayload | null>(null);
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          tone="primary"
          label={t("kpis.registeredUsers")}
          value={data.totals.registeredUsers}
        />
        <KpiCard
          tone="secondary"
          label={t("kpis.workspaceAccounts")}
          value={data.totals.workspaceAccounts}
        />
        <KpiCard
          tone="success"
          label={t("kpis.avgCompletion")}
          value={`${data.totals.averageCompletionPercent}%`}
        />
        <KpiCard
          tone="warning"
          label={t("kpis.draftArticles")}
          value={data.totals.draftArticles}
        />
        <KpiCard
          tone="neutral"
          label={t("kpis.reworkedArticles")}
          value={data.totals.reworkedArticles}
        />
        <KpiCard
          tone="primary"
          label={t("kpis.totalArticles")}
          value={data.totals.totalArticles}
        />
      </div>

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
          buckets={buckets}
          accentClass="bg-ns-primary"
        />
      </section>

      <UsersMetricsTable
        users={data.users}
        labels={{
          title: t("usersTable.title"),
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
        }}
      />

      <p className="text-xs text-ns-secondary">
        {t("footnote")}{" "}
        <Link href="/articles/new" className="font-semibold text-ns-primary hover:underline">
          {t("backToApp")}
        </Link>
      </p>
    </DashboardPageShell>
  );
}
