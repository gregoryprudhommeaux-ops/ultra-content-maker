"use client";

import { ARTICLE_CREATION_MODES } from "@/lib/articles/infer-creation-mode";
import type { ConnectionBucket } from "@/lib/admin/analytics-types";
import type { ArticleCreationMode } from "@/types/workspace";

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
  emptyLabel?: string;
  buckets: ConnectionBucket[];
  accentClass?: string;
};

export function UsageBarChart({
  title,
  subtitle,
  emptyLabel,
  buckets,
  accentClass = BAR_COLORS[0],
}: Props) {
  const max = Math.max(1, ...buckets.map((b) => b.uniqueUsers));
  const totalConnections = buckets.reduce((sum, b) => sum + b.uniqueUsers, 0);
  /** h-52 minus label row (~28px) */
  const trackHeightPx = 180;
  const labelStep = buckets.length > 24 ? 4 : buckets.length > 14 ? 2 : 1;

  return (
    <section className="rounded-2xl border border-ns-alternate/80 bg-ns-surface p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-bold text-ns-hero">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-ns-secondary">{subtitle}</p> : null}
      </div>

      <div className="flex h-52 gap-1 sm:gap-1.5">
        {buckets.map((bucket, index) => {
          const barHeightPx =
            bucket.uniqueUsers === 0
              ? 0
              : Math.max(4, Math.round((bucket.uniqueUsers / max) * trackHeightPx));
          const color = BAR_COLORS[index % BAR_COLORS.length];
          return (
            <div
              key={bucket.label}
              className="group flex min-w-0 flex-1 flex-col"
              title={`${bucket.label}: ${bucket.uniqueUsers}`}
            >
              <div className="flex min-h-0 flex-1 flex-col items-center justify-end">
                {bucket.uniqueUsers > 0 ? (
                  <span className="mb-1 text-[10px] font-semibold text-ns-tertiary opacity-0 transition-opacity group-hover:opacity-100 sm:text-xs">
                    {bucket.uniqueUsers}
                  </span>
                ) : null}
                <div
                  className={`w-full rounded-t-md ${bucket.uniqueUsers > 0 ? accentClass ?? color : "bg-ns-alternate/40"} transition-all`}
                  style={{ height: barHeightPx }}
                />
              </div>
              <span className="mt-2 truncate text-center text-[9px] font-medium text-ns-secondary sm:text-[10px]">
                {index % labelStep === 0 || index === buckets.length - 1
                  ? bucket.shortLabel
                  : ""}
              </span>
            </div>
          );
        })}
      </div>

      {totalConnections === 0 && emptyLabel ? (
        <p className="mt-3 text-center text-sm text-ns-secondary">{emptyLabel}</p>
      ) : null}
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

export const CREATION_MODE_CHART_COLORS: Record<ArticleCreationMode, string> = {
  profile: "#b8d430",
  news: "#0ea5e9",
  inspiration: "#7c3aed",
  article: "#d97706",
};

type PieSlice = {
  mode: ArticleCreationMode;
  label: string;
  count: number;
};

type PieProps = {
  title: string;
  subtitle?: string;
  emptyLabel?: string;
  totalLabel?: string;
  slices: PieSlice[];
};

function buildConicGradient(slices: PieSlice[], total: number): string {
  let cursor = 0;
  const stops: string[] = [];
  for (const slice of slices) {
    if (slice.count <= 0) continue;
    const start = cursor;
    cursor += (slice.count / total) * 100;
    stops.push(`${CREATION_MODE_CHART_COLORS[slice.mode]} ${start}% ${cursor}%`);
  }
  if (stops.length === 0) return "conic-gradient(#e5e7eb 0% 100%)";
  return `conic-gradient(${stops.join(", ")})`;
}

export function CreationModePieChart({
  title,
  subtitle,
  emptyLabel,
  totalLabel = "posts",
  slices,
}: PieProps) {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  const activeSlices = slices.filter((slice) => slice.count > 0);

  return (
    <section className="rounded-2xl border border-ns-alternate/80 bg-ns-surface p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-bold text-ns-hero">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-ns-secondary">{subtitle}</p> : null}
      </div>

      {total === 0 ? (
        emptyLabel ? (
          <p className="py-16 text-center text-sm text-ns-secondary">{emptyLabel}</p>
        ) : null
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
          <div className="relative h-44 w-44 shrink-0">
            <div
              className="h-full w-full rounded-full"
              style={{ background: buildConicGradient(slices, total) }}
              role="img"
              aria-label={title}
            />
            <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-ns-surface text-center">
              <span className="text-2xl font-bold tabular-nums text-ns-hero">{total}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ns-secondary">
                {totalLabel}
              </span>
            </div>
          </div>

          <ul className="w-full max-w-xs space-y-2.5">
            {ARTICLE_CREATION_MODES.map((mode) => {
              const slice = slices.find((s) => s.mode === mode);
              const count = slice?.count ?? 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <li key={mode} className="flex items-center gap-3 text-sm">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: CREATION_MODE_CHART_COLORS[mode] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-ns-tertiary">
                    {slice?.label ?? mode}
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold text-ns-hero">
                    {count}
                    <span className="ml-1 text-xs font-medium text-ns-secondary">({pct}%)</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {total > 0 && activeSlices.length === 1 ? (
        <p className="mt-4 text-center text-xs text-ns-secondary">
          {activeSlices[0]?.label} — 100%
        </p>
      ) : null}
    </section>
  );
}
