"use client";

import type { RevenueSummary } from "@/lib/admin/admin-economics";
import { ALL_SUBSCRIPTION_TIERS } from "@/lib/subscription/constants";
import type { SubscriptionTier } from "@/types/subscription";

const TIER_ORDER: SubscriptionTier[] = ALL_SUBSCRIPTION_TIERS;

const TIER_BAR: Record<SubscriptionTier, string> = {
  free_test: "bg-slate-400",
  pro: "bg-sky-500",
  pro_plus: "bg-indigo-500",
  support_starter: "bg-emerald-500",
  support_regular: "bg-teal-500",
  support_total: "bg-cyan-500",
  full_free: "bg-violet-500",
  free_without_api: "bg-amber-500",
  expired: "bg-rose-400",
};

type Props = {
  counts: RevenueSummary["countByTier"];
  labels: Record<SubscriptionTier, string>;
  title: string;
  subtitle?: string;
};

export function AdminTierMixBar({ counts, labels, title, subtitle }: Props) {
  const total = TIER_ORDER.reduce((sum, tier) => sum + counts[tier], 0);

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ns-primary">{title}</p>
        <h2 className="mt-1 text-lg font-bold text-ns-tertiary">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-ns-secondary">{subtitle}</p> : null}
      </header>
      <div className="flex flex-wrap gap-2">
        {TIER_ORDER.map((tier) => {
          const count = counts[tier];
          if (count === 0 && total > 0 && tier === "expired") return null;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div
              key={tier}
              className="flex min-w-[7rem] flex-1 flex-col rounded-2xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm"
            >
              <span className="text-[10px] font-bold uppercase tracking-wide text-ns-secondary">
                {labels[tier]}
              </span>
              <span className="mt-0.5 text-2xl font-bold tabular-nums text-ns-hero">{count}</span>
              {total > 0 ? (
                <span className="text-[11px] font-medium text-ns-secondary">{pct}%</span>
              ) : null}
            </div>
          );
        })}
      </div>
      {total === 0 ? (
        <p className="mt-3 text-sm text-ns-secondary">N/D</p>
      ) : (
        <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-ns-brand-light">
          {TIER_ORDER.filter((tier) => counts[tier] > 0).map((tier) => (
            <div
              key={tier}
              className={`h-full ${TIER_BAR[tier]}`}
              style={{ width: `${(counts[tier] / total) * 100}%` }}
              title={`${labels[tier]}: ${counts[tier]}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
