import type { Firestore } from "firebase-admin/firestore";
import { buildAdminAnalytics } from "@/lib/admin/analytics.server";
import {
  computeRevenueSummary,
  listBlockedUsers,
} from "@/lib/admin/admin-economics";
import { loadDigestSnapshot, saveDigestSnapshot } from "@/lib/admin/admin-digest-snapshot.server";
import { listErrorReports } from "@/lib/admin/error-reports.server";
import { listWireRequests } from "@/lib/billing/wire-requests.server";
import { summarizeLlmUsage } from "@/lib/admin/llm-usage.server";

export type WeeklyDigestRow = {
  email: string;
  displayName: string | null;
  detail: string;
};

export type WeeklyDigestPayload = {
  periodLabel: string;
  generatedAt: string;
  mrrUsd: number;
  mrrDeltaUsd: number | null;
  registeredUsers: number;
  newSignups7d: number;
  validatedArticles: number;
  activeUsersWeek: number;
  openErrorReports: number;
  pendingWireTransfers: number;
  wireSentCount: number;
  llmCost7dUsd: number;
  grossMarginUsd: number;
  tierCounts: {
    free_test: number;
    pro: number;
    pro_plus: number;
    support: number;
    expired: number;
  };
  blockedTop: WeeklyDigestRow[];
  costlyTop: WeeklyDigestRow[];
  supportAlerts: WeeklyDigestRow[];
  contractRenewalsDue: number;
  adminUrl: string;
};

function defaultIncludedUserIds(
  users: Awaited<ReturnType<typeof buildAdminAnalytics>>["users"],
): Set<string> {
  return new Set(
    users.filter((u) => !u.excludeFromStatsDefault).map((u) => u.userId),
  );
}

function weekPeriodLabel(now = new Date()): string {
  const end = new Date(now);
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 7);
  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${fmt(start)} → ${fmt(end)}`;
}

function blockReasonLabel(code: string | null | undefined): string {
  switch (code) {
    case "trial_expired":
      return "Essai expiré";
    case "trial_posts_exhausted":
      return "Crédits essai épuisés";
    case "subscription_required":
      return "Abonnement requis";
    case "pro_cap":
      return "Quota Pro atteint";
    case "pro_plus_cap":
      return "Quota Pro+ atteint";
    case "support_no_generate":
      return "Support (pas de génération)";
    default:
      return "Onboarding incomplet";
  }
}

export async function buildWeeklyDigestPayload(db: Firestore): Promise<WeeklyDigestPayload> {
  const now = new Date();
  const since7d = new Date(now);
  since7d.setUTCDate(since7d.getUTCDate() - 7);

  const [analytics, llm7d, errorReports, wireRequests, previousSnapshot, renewalsDue] =
    await Promise.all([
      buildAdminAnalytics(db, { connectionPeriods: ["week"], useCache: false }),
      summarizeLlmUsage(db, since7d),
      listErrorReports(db, 100),
      listWireRequests(db, 50),
      loadDigestSnapshot(db),
      import("@/lib/billing/support-contract-renewal.server").then((m) =>
        m.listSupportRenewalsDue(db),
      ),
    ]);

  const included = defaultIncludedUserIds(analytics.users);
  const revenue = computeRevenueSummary(
    analytics.users,
    included,
    llm7d.platformCostUsd,
  );

  const signupCutoff = since7d.getTime();
  const newSignups7d = analytics.users.filter((u) => {
    if (!included.has(u.userId) || !u.createdAt) return false;
    return new Date(u.createdAt).getTime() >= signupCutoff;
  }).length;

  const weekBuckets = analytics.connections.week ?? [];
  const activeUsersWeek = weekBuckets.reduce((sum, b) => sum + b.uniqueUsers, 0);

  const blocked = listBlockedUsers(analytics.users, included, {
    blocked: "Bloqué",
    lowCompletion: "Onboarding faible",
  })
    .sort((a, b) => b.usageScore - a.usageScore)
    .slice(0, 5);

  const userById = new Map(analytics.users.map((u) => [u.userId, u]));
  const costlyTop = Object.entries(llm7d.byUserId)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([userId, costUsd]) => {
      const user = userById.get(userId);
      return {
        email: user?.email ?? userId,
        displayName: user?.displayName ?? null,
        detail: `$${costUsd.toFixed(2)} LLM (7j)`,
      };
    });

  const supportAlerts = analytics.supportAccounts
    .filter((s) => s.deliveryStatus === "at_risk" || s.deliveryStatus === "over_quota")
    .slice(0, 5)
    .map((s) => ({
      email: s.email,
      displayName: s.displayName,
      detail: `${s.deliveredThisMonth}/${s.monthlyQuota} posts · ${s.deliveryStatus}`,
    }));

  const openWires = wireRequests.filter(
    (r) => r.status === "pending" || r.status === "wire_sent",
  );

  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://ultra-content-maker.vercel.app";

  const mrrDeltaUsd =
    previousSnapshot != null ? revenue.mrrUsd - previousSnapshot.mrrUsd : null;

  return {
    periodLabel: weekPeriodLabel(now),
    generatedAt: now.toISOString(),
    mrrUsd: revenue.mrrUsd,
    mrrDeltaUsd,
    registeredUsers: analytics.totals.registeredUsers,
    newSignups7d,
    validatedArticles: analytics.totals.validatedArticles,
    activeUsersWeek,
    openErrorReports: errorReports.filter((r) => r.status === "open").length,
    pendingWireTransfers: openWires.filter((r) => r.status === "pending").length,
    wireSentCount: openWires.filter((r) => r.status === "wire_sent").length,
    llmCost7dUsd: llm7d.platformCostUsd,
    grossMarginUsd: revenue.estimatedGrossMarginUsd,
    tierCounts: {
      free_test: revenue.countByTier.free_test,
      pro: revenue.countByTier.pro,
      pro_plus: revenue.countByTier.pro_plus,
      support:
        revenue.countByTier.support_starter +
        revenue.countByTier.support_regular +
        revenue.countByTier.support_total,
      expired: revenue.countByTier.expired,
    },
    blockedTop: blocked.map((u) => ({
      email: u.email,
      displayName: u.displayName,
      detail: `${u.stuckReason} · ${blockReasonLabel(u.blockReason)} · reste ${u.postsRemaining ?? "N/D"}`,
    })),
    costlyTop,
    supportAlerts,
    contractRenewalsDue: renewalsDue.length,
    adminUrl: `${site}/fr/admin/analytics?tab=billing`,
  };
}

export async function runWeeklyAdminDigest(
  db: Firestore,
): Promise<{ payload: WeeklyDigestPayload; emailed: boolean }> {
  const payload = await buildWeeklyDigestPayload(db);
  const { sendAdminWeeklyDigestEmail, isAdminDigestEmailConfigured } = await import(
    "@/lib/email/send-admin-weekly-digest"
  );

  let emailed = false;
  if (isAdminDigestEmailConfigured()) {
    await sendAdminWeeklyDigestEmail(payload);
    emailed = true;
  }

  await saveDigestSnapshot(db, {
    mrrUsd: payload.mrrUsd,
    registeredUsers: payload.registeredUsers,
    validatedArticles: payload.validatedArticles,
  });

  return { payload, emailed };
}
