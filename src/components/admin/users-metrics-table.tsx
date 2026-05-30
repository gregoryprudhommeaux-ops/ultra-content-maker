"use client";

import type { AdminUserMetrics } from "@/lib/admin/analytics.server";
import { useMemo, useState } from "react";

export type UserSortKey =
  | "usageScore"
  | "completionPercent"
  | "totalArticles"
  | "draftArticles"
  | "reworkedArticles"
  | "email"
  | "createdAt";

type Props = {
  users: AdminUserMetrics[];
  labels: {
    title: string;
    rank: string;
    name: string;
    email: string;
    linkedin: string;
    createdAt: string;
    accounts: string;
    completion: string;
    drafts: string;
    reworked: string;
    totalArticles: string;
    usage: string;
    lastLogin: string;
    sortBy: string;
    noLinkedin: string;
    noDate: string;
  };
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function completionTone(percent: number): string {
  if (percent >= 80) return "bg-emerald-100 text-emerald-900";
  if (percent >= 50) return "bg-amber-100 text-amber-950";
  return "bg-rose-100 text-rose-900";
}

export function UsersMetricsTable({ users, labels }: Props) {
  const [sortKey, setSortKey] = useState<UserSortKey>("usageScore");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...users];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortAsc ? av - bv : bv - av;
      }
      const as = String(av ?? "");
      const bs = String(bv ?? "");
      return sortAsc ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return copy;
  }, [users, sortKey, sortAsc]);

  function onSort(key: UserSortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
      return;
    }
    setSortKey(key);
    setSortAsc(false);
  }

  function sortIndicator(key: UserSortKey) {
    if (sortKey !== key) return "";
    return sortAsc ? " ↑" : " ↓";
  }

  return (
    <section className="rounded-2xl border border-ns-alternate/80 bg-ns-surface shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ns-alternate/60 px-5 py-4">
        <div>
          <h3 className="text-base font-bold text-ns-hero">{labels.title}</h3>
          <p className="mt-1 text-sm text-ns-secondary">{labels.sortBy}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ns-brand-light text-xs uppercase tracking-wider text-ns-secondary">
            <tr>
              <th className="px-4 py-3 font-semibold">{labels.rank}</th>
              <th className="px-4 py-3 font-semibold">{labels.name}</th>
              <th className="px-4 py-3 font-semibold">
                <button type="button" onClick={() => onSort("email")} className="hover:text-ns-hero">
                  {labels.email}
                  {sortIndicator("email")}
                </button>
              </th>
              <th className="px-4 py-3 font-semibold">{labels.linkedin}</th>
              <th className="px-4 py-3 font-semibold">
                <button type="button" onClick={() => onSort("createdAt")} className="hover:text-ns-hero">
                  {labels.createdAt}
                  {sortIndicator("createdAt")}
                </button>
              </th>
              <th className="px-4 py-3 font-semibold">{labels.accounts}</th>
              <th className="px-4 py-3 font-semibold">
                <button
                  type="button"
                  onClick={() => onSort("completionPercent")}
                  className="hover:text-ns-hero"
                >
                  {labels.completion}
                  {sortIndicator("completionPercent")}
                </button>
              </th>
              <th className="px-4 py-3 font-semibold">
                <button type="button" onClick={() => onSort("draftArticles")} className="hover:text-ns-hero">
                  {labels.drafts}
                  {sortIndicator("draftArticles")}
                </button>
              </th>
              <th className="px-4 py-3 font-semibold">
                <button
                  type="button"
                  onClick={() => onSort("reworkedArticles")}
                  className="hover:text-ns-hero"
                >
                  {labels.reworked}
                  {sortIndicator("reworkedArticles")}
                </button>
              </th>
              <th className="px-4 py-3 font-semibold">
                <button
                  type="button"
                  onClick={() => onSort("totalArticles")}
                  className="hover:text-ns-hero"
                >
                  {labels.totalArticles}
                  {sortIndicator("totalArticles")}
                </button>
              </th>
              <th className="px-4 py-3 font-semibold">
                <button type="button" onClick={() => onSort("usageScore")} className="hover:text-ns-hero">
                  {labels.usage}
                  {sortIndicator("usageScore")}
                </button>
              </th>
              <th className="px-4 py-3 font-semibold">{labels.lastLogin}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ns-alternate/50">
            {sorted.map((user, index) => (
              <tr key={user.userId} className="hover:bg-ns-brand-light/70">
                <td className="px-4 py-3 font-bold tabular-nums text-ns-tertiary">#{index + 1}</td>
                <td className="px-4 py-3 font-medium text-ns-hero">
                  {user.displayName ?? "—"}
                </td>
                <td className="px-4 py-3 text-ns-tertiary">{user.email}</td>
                <td className="max-w-[180px] truncate px-4 py-3">
                  {user.linkedinUrl ? (
                    <a
                      href={user.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ns-secondary underline-offset-2 hover:text-ns-primary hover:underline"
                    >
                      LinkedIn
                    </a>
                  ) : (
                    <span className="text-ns-alternate">{labels.noLinkedin}</span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums text-ns-tertiary">
                  {formatDate(user.createdAt) === "—" ? labels.noDate : formatDate(user.createdAt)}
                </td>
                <td className="px-4 py-3 tabular-nums text-ns-tertiary">{user.accountCount}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex min-w-[3rem] justify-center rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${completionTone(user.completionPercent)}`}
                  >
                    {user.completionPercent}%
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums font-semibold text-amber-800">
                  {user.draftArticles}
                </td>
                <td className="px-4 py-3 tabular-nums font-semibold text-violet-800">
                  {user.reworkedArticles}
                </td>
                <td className="px-4 py-3 tabular-nums text-ns-hero">{user.totalArticles}</td>
                <td className="px-4 py-3 tabular-nums font-bold text-ns-primary">
                  {user.usageScore}
                </td>
                <td className="px-4 py-3 tabular-nums text-ns-secondary">
                  {formatDate(user.lastLoginAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
