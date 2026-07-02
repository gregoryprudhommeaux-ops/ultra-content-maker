"use client";

import type { AdminUserMetrics } from "@/lib/admin/analytics-types";
import { ALL_SUBSCRIPTION_TIERS } from "@/lib/subscription/constants";
import type { SubscriptionTier } from "@/types/subscription";
import { getClientAuth } from "@/lib/firebase/client";
import { useTranslations } from "next-intl";
import { useState } from "react";

export const ADMIN_ASSIGNABLE_TIERS: SubscriptionTier[] = ALL_SUBSCRIPTION_TIERS;

type Props = {
  user: AdminUserMetrics;
  tierLabels: Record<SubscriptionTier, string>;
  tierToneClass: string;
  labels: {
    changeTier: string;
    confirm: string;
    cancel: string;
    saving: string;
    changeFailed: string;
  };
  onChanged: () => void;
};

function currentTierValue(user: AdminUserMetrics): SubscriptionTier {
  return user.isExpired ? "expired" : user.subscriptionTier;
}

export function AdminUserTierSelect({
  user,
  tierLabels,
  tierToneClass,
  labels,
  onChanged,
}: Props) {
  const tUsers = useTranslations("adminAnalytics.usersTable");
  const [pendingTier, setPendingTier] = useState<SubscriptionTier | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = currentTierValue(user);

  async function applyTier(tier: SubscriptionTier) {
    setSaving(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = await auth?.currentUser?.getIdToken();
      if (!token) throw new Error("auth");

      const res = await fetch("/api/admin/subscription", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.userId,
          tier,
          activationMethod: "admin",
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "api");
      }
      setPendingTier(null);
      onChanged();
    } catch {
      setError(labels.changeFailed);
    } finally {
      setSaving(false);
    }
  }

  function onSelectChange(nextTier: SubscriptionTier) {
    if (nextTier === current) {
      setPendingTier(null);
      setError(null);
      return;
    }
    setPendingTier(nextTier);
    setError(null);
  }

  if (pendingTier) {
    return (
      <div className="min-w-[11rem] space-y-1.5">
        <p className="text-[11px] leading-snug text-ns-secondary">
          {tUsers("confirmTierChange", {
            name: user.displayName ?? user.email,
            tier: tierLabels[pendingTier],
          })}
        </p>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            disabled={saving}
            onClick={() => void applyTier(pendingTier)}
            className="rounded-md bg-ns-hero px-2 py-1 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? labels.saving : labels.confirm}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => setPendingTier(null)}
            className="rounded-md border border-ns-alternate px-2 py-1 text-[11px] font-semibold text-ns-secondary hover:bg-white"
          >
            {labels.cancel}
          </button>
        </div>
        {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label className="sr-only">
        {labels.changeTier}: {user.displayName ?? user.email}
      </label>
      <select
        value={current}
        onChange={(event) => onSelectChange(event.target.value as SubscriptionTier)}
        aria-label={`${labels.changeTier}, ${user.displayName ?? user.email}`}
        className={`max-w-[10.5rem] cursor-pointer rounded-full border-0 py-1 pl-2.5 pr-7 text-xs font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-ns-primary/40 ${tierToneClass}`}
      >
        {ADMIN_ASSIGNABLE_TIERS.map((tier) => (
          <option key={tier} value={tier}>
            {tierLabels[tier]}
          </option>
        ))}
      </select>
      {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}
