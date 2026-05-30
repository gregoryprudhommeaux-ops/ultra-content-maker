"use client";

import { KpiCard, UsageBarChart } from "@/components/admin/analytics-charts";
import { UsersMetricsTable } from "@/components/admin/users-metrics-table";
import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/contexts/workspace-context";
import type {
  AdminAnalyticsPayload,
  ConnectionGranularity,
} from "@/lib/admin/analytics.server";
import { getClientAuth } from "@/lib/firebase/client";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

const PERIODS: ConnectionGranularity[] = ["day", "week", "month", "year"];

export function AdminAnalyticsDashboard() {
  const t = useTranslations("adminAnalytics");
  const { user } = useAuth();
  const { isPlatformAdmin, loading: workspaceLoading } = useWorkspace();
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
        setError(t("errors.loadFailed"));
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
    if (workspaceLoading) return;
    if (!isPlatformAdmin) {
      router.replace("/articles/new");
      return;
    }
    void load();
  }, [isPlatformAdmin, workspaceLoading, load, router]);

  if (workspaceLoading || (!data && loading)) {
    return (
      <div className="rounded-2xl border border-ns-alternate/80 bg-ns-surface p-8 text-center text-ns-secondary">
        {t("loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <p className="font-semibold">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-lg bg-ns-hero px-4 py-2 text-sm font-semibold text-white"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  if (!data) return null;

  const buckets = data.connections[period];

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ns-secondary">
            {t("eyebrow")}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ns-hero md:text-3xl">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ns-secondary">{t("subtitle")}</p>
          <p className="mt-2 text-xs text-ns-alternate">
            {t("generatedAt", {
              date: new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(data.generatedAt)),
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-ns-alternate bg-white px-4 py-2 text-sm font-semibold text-ns-hero hover:border-ns-primary"
        >
          {t("refresh")}
        </button>
      </header>

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
    </div>
  );
}
