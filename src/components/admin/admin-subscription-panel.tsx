"use client";

import { AdminPanelShell } from "@/components/admin/admin-cockpit-layout";
import { ADMIN_ASSIGNABLE_TIERS } from "@/components/admin/admin-user-tier-select";
import { SupportPlanPicker } from "@/components/pricing/support-plan-picker";
import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import type { SupportQuotePlan } from "@/lib/email/send-support-quote";
import {
  isSupportTier,
  PRICING,
  supportRhythmFromTier,
  supportTierFromRhythm,
} from "@/lib/subscription/constants";
import type { SubscriptionTier, SupportProposal } from "@/types/subscription";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { useTranslations } from "next-intl";
import { useState } from "react";

type AdminSubscriptionPanelProps = {
  embedded?: boolean;
};

function buildSupportProposal(
  rhythm: SupportQuotePlan,
  customPosts: string,
  customPeriod: "week" | "month",
): SupportProposal | undefined {
  if (rhythm === "starter") return { rhythm: "starter" };
  if (rhythm === "regular") return { rhythm: "regular" };
  if (rhythm === "much_more") {
    const postsCount = Math.max(1, Number(customPosts) || 1);
    return { rhythm: "custom", postsCount, period: customPeriod };
  }
  return undefined;
}

export function AdminSubscriptionPanel({ embedded = false }: AdminSubscriptionPanelProps) {
  const t = useTranslations("adminSubscription");
  const { user } = useAuth();
  const [userId, setUserId] = useState("");
  const [tier, setTier] = useState<SubscriptionTier>("pro_plus");
  const [supportPlan, setSupportPlan] = useState<SupportQuotePlan>("starter");
  const [customPosts, setCustomPosts] = useState("3");
  const [customPeriod, setCustomPeriod] = useState<"week" | "month">("week");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSupport = isSupportTier(tier);

  const proposalSummary = (() => {
    if (!isSupport) return null;
    if (supportPlan === "starter") return t("proposalStarter");
    if (supportPlan === "regular") return t("proposalRegular");
    if (supportPlan === "much_more") {
      const count = Math.max(1, Number(customPosts) || 1);
      return t("proposalCustom", {
        count,
        period: customPeriod === "week" ? t("perWeek") : t("perMonth"),
      });
    }
    return null;
  })();

  const customPostsLabel =
    customPeriod === "week" ? t("customPostsPerWeek") : t("customPostsPerMonth");

  function onTierChange(nextTier: SubscriptionTier) {
    setTier(nextTier);
    const rhythm = supportRhythmFromTier(nextTier);
    if (rhythm) setSupportPlan(rhythm);
  }

  function onSupportPlanChange(plan: SupportQuotePlan) {
    setSupportPlan(plan);
    if (plan === "starter" || plan === "regular" || plan === "much_more") {
      setTier(supportTierFromRhythm(plan));
    }
  }

  async function submit() {
    if (!user || !userId.trim()) return;
    if (isSupport && supportPlan === "much_more" && !(Number(customPosts) > 0)) {
      setError(t("customPostsRequired"));
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) throw new Error("auth");

      const supportProposal = isSupport
        ? buildSupportProposal(supportPlan, customPosts, customPeriod)
        : undefined;

      const res = await fetch("/api/admin/subscription", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId.trim(),
          tier,
          supportProposal,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; profile?: { tier?: string } };
      if (!res.ok) {
        setError(body.error ?? t("error"));
        return;
      }
      setMessage(t("success", { tier: body.profile?.tier ?? tier }));
    } catch {
      setError(t("error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminPanelShell embedded={embedded}>
      <h2 className="text-lg font-bold text-ns-tertiary">{t("title")}</h2>
      <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
      <div className={`mt-4 grid gap-4 ${embedded ? "grid-cols-1" : "sm:grid-cols-2"}`}>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ns-tertiary">{t("userId")}</span>
          <input
            className="w-full rounded-lg border border-ns-border px-3 py-2"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Firebase UID"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ns-tertiary">{t("tier")}</span>
          <select
            className="w-full rounded-lg border border-ns-border px-3 py-2"
            value={tier}
            onChange={(e) => onTierChange(e.target.value as SubscriptionTier)}
          >
            {ADMIN_ASSIGNABLE_TIERS.map((tierOption) => (
              <option key={tierOption} value={tierOption}>
                {tierOption}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!isSupport && (tier === "pro" || tier === "pro_plus") ? (
        <p className="mt-4 rounded-lg border border-ns-border/80 bg-ns-background px-4 py-3 text-sm text-ns-secondary">
          {t("selfServeQuotaNote", { posts: PRICING.proPlus.postsPerMonth })}
        </p>
      ) : null}

      {isSupport ? (
        <div className="mt-6 space-y-4 rounded-xl border border-ns-border/80 bg-ns-brand-light/30 p-4">
          <div>
            <p className="text-sm font-semibold text-ns-tertiary">{t("supportRhythmTitle")}</p>
            <p className="mt-1 text-xs text-ns-secondary">{t("supportRhythmHint")}</p>
          </div>
          <SupportPlanPicker value={supportPlan} onChange={onSupportPlanChange} />
          {proposalSummary ? (
            <p className="rounded-lg border border-ns-primary/30 bg-ns-primary/10 px-4 py-3 text-sm font-medium text-ns-tertiary">
              {t("proposalSummary", { detail: proposalSummary })}
            </p>
          ) : null}
          {supportPlan === "much_more" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-ns-tertiary">{t("customPeriod")}</span>
                <select
                  className="w-full rounded-lg border border-ns-border px-3 py-2"
                  value={customPeriod}
                  onChange={(e) => setCustomPeriod(e.target.value as "week" | "month")}
                >
                  <option value="week">{t("perWeek")}</option>
                  <option value="month">{t("perMonth")}</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-ns-tertiary">{customPostsLabel}</span>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-lg border border-ns-border px-3 py-2"
                  value={customPosts}
                  onChange={(e) => setCustomPosts(e.target.value)}
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className={`mt-4 w-full sm:w-auto ${BTN_PRIMARY}`}
        disabled={pending || !userId.trim()}
        onClick={submit}
      >
        {pending ? t("pending") : t("submit")}
      </button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-2 text-sm text-green-700">{message}</p> : null}
    </AdminPanelShell>
  );
}
