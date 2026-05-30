"use client";

import type { ConnectionBucket } from "@/lib/admin/analytics.server";

const BAR_COLORS = [
  "bg-ns-primary",
  "bg-ns-secondary",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-amber-500",
] as const;

type Props = {
  title: string;
  subtitle?: string;
  buckets: ConnectionBucket[];
  accentClass?: string;
};

export function UsageBarChart({
  title,
  subtitle,
  buckets,
  accentClass = BAR_COLORS[0],
}: Props) {
  const max = Math.max(1, ...buckets.map((b) => b.uniqueUsers));

  return (
    <section className="rounded-2xl border border-ns-alternate/80 bg-ns-surface p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-bold text-ns-hero">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-ns-secondary">{subtitle}</p> : null}
      </div>

      <div className="flex h-52 items-end gap-1.5 sm:gap-2">
        {buckets.map((bucket, index) => {
          const height = Math.max(6, Math.round((bucket.uniqueUsers / max) * 100));
          const color = BAR_COLORS[index % BAR_COLORS.length];
          return (
            <div
              key={bucket.label}
              className="group flex min-w-0 flex-1 flex-col items-center justify-end"
              title={`${bucket.label}: ${bucket.uniqueUsers}`}
            >
              <span className="mb-1 text-[10px] font-semibold text-ns-tertiary opacity-0 transition-opacity group-hover:opacity-100 sm:text-xs">
                {bucket.uniqueUsers}
              </span>
              <div
                className={`w-full rounded-t-md ${accentClass ?? color} transition-all`}
                style={{ height: `${height}%` }}
              />
              <span className="mt-2 truncate text-[9px] font-medium text-ns-secondary sm:text-[10px]">
                {bucket.shortLabel}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type KpiProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "primary" | "secondary" | "neutral" | "warning" | "success";
};

const KPI_TONES: Record<NonNullable<KpiProps["tone"]>, string> = {
  primary: "border-ns-primary/30 bg-ns-primary/10 text-ns-hero",
  secondary: "border-ns-secondary/30 bg-ns-secondary/10 text-ns-hero",
  neutral: "border-ns-alternate bg-ns-brand-light text-ns-hero",
  warning: "border-amber-300 bg-amber-50 text-amber-950",
  success: "border-emerald-300 bg-emerald-50 text-emerald-950",
};

export function KpiCard({ label, value, hint, tone = "neutral" }: KpiProps) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${KPI_TONES[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-widest opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs opacity-75">{hint}</p> : null}
    </div>
  );
}
