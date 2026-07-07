"use client";

import { AdminUserTierSelect, ADMIN_ASSIGNABLE_TIERS } from "@/components/admin/admin-user-tier-select";
import { AdminUserControlAction } from "@/components/admin/admin-user-control-action";
import { AdminProfileCompletionHint } from "@/components/admin/admin-profile-completion-hint";
import type { AdminUserMetrics } from "@/lib/admin/analytics-types";
import type { SubscriptionTier } from "@/types/subscription";
import { getClientAuth } from "@/lib/firebase/client";
import { useMemo, useState, type CSSProperties } from "react";

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
 currentAdminUserId: string;
 includedUserIds: ReadonlySet<string>;
 onToggleIncluded: (userId: string, included: boolean) => void;
 onUserDeleted: (userId: string) => void;
 onUserUpdated?: () => void;
 labels: {
 title: string;
 includeInStats: string;
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
 validated: string;
 tier: string;
 postsRemaining: string;
 blockReason: string;
 usage: string;
 lastLogin: string;
 sortBy: string;
 noLinkedin: string;
 noDate: string;
 actions: string;
 delete: string;
 confirmDelete: string;
 confirm: string;
 cancel: string;
 deleting: string;
 deleteSelf: string;
 deleteFailed: string;
 control: {
  control: string;
  takeover: string;
  confirmControl: string;
  confirmTakeover: string;
  controlling: string;
  controlSuccess: string;
  release: string;
  confirmRelease: string;
  releasing: string;
  releaseSuccess: string;
  openWorkspace: string;
  managedByYou: string;
  managedByOther: string;
  cannotControlAdmin: string;
  cannotControlSelf: string;
  controlFailed: string;
  confirm: string;
  cancel: string;
 };
 tierLabels: Record<SubscriptionTier, string>;
 blockCodes: Record<string, string>;
 noBlock: string;
 onboardingSteps: {
  llm: string;
  author: string;
  audience: string;
  persona: string;
  firstArticle: string;
  firstValidated: string;
  hint: string;
  complete: string;
  missingTitle: string;
  guideHint: string;
  hoverHint: string;
 };
 tierChange: {
  changeTier: string;
  confirm: string;
  cancel: string;
  saving: string;
  changeFailed: string;
  filterAll: string;
  filterLabel: string;
 };
};
};

function formatDate(iso: string | null): string {
 if (!iso) return "-";
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

/** Left offsets for frozen columns through Nom (checkbox, #, name). */
const FROZEN_COL = [
 { left: "0px", width: "2.75rem", shadow: false },
 { left: "2.75rem", width: "3.25rem", shadow: false },
 { left: "6rem", width: "11rem", shadow: true },
] as const;

function frozenCellClass(
 index: 0 | 1 | 2,
 variant: "head" | "body",
 extra?: string,
): string {
 const col = FROZEN_COL[index];
 const bg =
  variant === "head"
   ? "bg-ns-brand-light"
   : "bg-ns-surface group-hover:bg-[#f4f6ef] group-[.is-dimmed]:bg-ns-surface/90";
 const shadow = col.shadow
  ? "shadow-[4px_0_8px_-2px_rgba(15,23,42,0.12)] after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-ns-alternate/60"
  : "";
 return [
  "sticky relative z-20 box-border",
  shadow,
  bg,
  extra ?? "",
 ].join(" ");
}

function frozenCellStyle(index: 0 | 1 | 2): CSSProperties {
 const col = FROZEN_COL[index];
 return {
  left: col.left,
  minWidth: col.width,
  maxWidth: col.width,
  width: col.width,
 };
}

function tierTone(
 tier: AdminUserMetrics["effectiveTier"],
 isExpired: boolean,
): string {
 if (isExpired) return "bg-rose-100 text-rose-900";
 switch (tier) {
  case "free_test":
   return "bg-slate-100 text-slate-800";
  case "pro":
   return "bg-sky-100 text-sky-900";
  case "pro_plus":
   return "bg-indigo-100 text-indigo-900";
  case "support_starter":
   return "bg-emerald-100 text-emerald-900";
  case "support_regular":
   return "bg-teal-100 text-teal-900";
  case "support_total":
   return "bg-cyan-100 text-cyan-900";
  case "full_free":
   return "bg-violet-100 text-violet-900";
  case "free_without_api":
   return "bg-amber-100 text-amber-950";
  default:
   return "bg-ns-brand-light text-ns-tertiary";
 }
}

export function UsersMetricsTable({
 users,
 currentAdminUserId,
 includedUserIds,
 onToggleIncluded,
 onUserDeleted,
 onUserUpdated,
 labels,
}: Props) {
 const [sortKey, setSortKey] = useState<UserSortKey>("usageScore");
 const [sortAsc, setSortAsc] = useState(false);
 const [tierFilter, setTierFilter] = useState<SubscriptionTier | "all">("all");
 const [confirmUserId, setConfirmUserId] = useState<string | null>(null);
 const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
 const [deleteError, setDeleteError] = useState<string | null>(null);

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

 const visibleUsers = useMemo(() => {
  if (tierFilter === "all") return sorted;
  return sorted.filter((user) => {
   const effective = user.isExpired ? "expired" : user.effectiveTier;
   return effective === tierFilter;
  });
 }, [sorted, tierFilter]);

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

 async function onDeleteUser(userId: string) {
 setDeleteError(null);
 setDeletingUserId(userId);
 try {
 const auth = getClientAuth();
 const token = await auth?.currentUser?.getIdToken();
 if (!token) throw new Error("auth");

 const res = await fetch("/api/admin/users/delete", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 Authorization: `Bearer ${token}`,
 },
 body: JSON.stringify({ userId }),
 });
 if (!res.ok) throw new Error("api");
 setConfirmUserId(null);
 onUserDeleted(userId);
 } catch {
 setDeleteError(labels.deleteFailed);
 } finally {
 setDeletingUserId(null);
 }
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
 <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
 <thead className="bg-ns-brand-light text-xs uppercase tracking-wider text-ns-secondary">
 <tr>
 <th
 className={`px-4 py-3 font-semibold ${frozenCellClass(0, "head")}`}
 style={frozenCellStyle(0)}
 >
 <span className="sr-only">{labels.includeInStats}</span>
 <span aria-hidden title={labels.includeInStats}>
 ✓
 </span>
 </th>
 <th
 className={`px-4 py-3 font-semibold ${frozenCellClass(1, "head")}`}
 style={frozenCellStyle(1)}
 >
 {labels.rank}
 </th>
 <th
 className={`px-4 py-3 font-semibold ${frozenCellClass(2, "head", "z-30")}`}
 style={frozenCellStyle(2)}
 >
 {labels.name}
 </th>
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
  <div className="flex flex-col gap-1.5">
   <span>{labels.tier}</span>
   <select
    value={tierFilter}
    onChange={(event) =>
     setTierFilter(event.target.value as SubscriptionTier | "all")
    }
    aria-label={labels.tierChange.filterLabel}
    className="max-w-[8.5rem] rounded-md border border-ns-alternate bg-white px-2 py-1 text-[10px] font-semibold normal-case text-ns-tertiary"
   >
    <option value="all">{labels.tierChange.filterAll}</option>
    {ADMIN_ASSIGNABLE_TIERS.map((tier) => (
     <option key={tier} value={tier}>
      {labels.tierLabels[tier]}
     </option>
    ))}
   </select>
  </div>
 </th>
 <th className="px-4 py-3 font-semibold">{labels.validated}</th>
 <th className="px-4 py-3 font-semibold">{labels.postsRemaining}</th>
 <th className="min-w-[12rem] max-w-[16rem] px-4 py-3 font-semibold">{labels.blockReason}</th>
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
 <th className="px-4 py-3 font-semibold">{labels.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-ns-alternate/50">
 {visibleUsers.map((user, index) => {
 const isSelf = user.userId === currentAdminUserId;
 const confirming = confirmUserId === user.userId;
 const deleting = deletingUserId === user.userId;

 return (
 <tr
 key={user.userId}
 className={`group hover:bg-ns-brand-light/70 ${includedUserIds.has(user.userId) ? "" : "is-dimmed opacity-55"}`}
 >
 <td
 className={`px-4 py-3 ${frozenCellClass(0, "body")}`}
 style={frozenCellStyle(0)}
 >
 <input
 type="checkbox"
 checked={includedUserIds.has(user.userId)}
 onChange={(event) => onToggleIncluded(user.userId, event.target.checked)}
 aria-label={`${labels.includeInStats}: ${user.displayName ?? user.email}`}
 className="h-4 w-4 rounded border-ns-alternate text-ns-primary focus:ring-ns-primary"
 />
 </td>
 <td
 className={`px-4 py-3 font-bold tabular-nums text-ns-tertiary ${frozenCellClass(1, "body")}`}
 style={frozenCellStyle(1)}
 >
 #{index + 1}
 </td>
 <td
 className={`px-4 py-3 font-medium text-ns-hero ${frozenCellClass(2, "body", "truncate")}`}
 style={frozenCellStyle(2)}
 title={user.displayName ?? undefined}
 >
 {user.displayName ?? "-"}
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
 {formatDate(user.createdAt) === "-" ? labels.noDate : formatDate(user.createdAt)}
 </td>
 <td className="px-4 py-3 tabular-nums text-ns-tertiary">{user.accountCount}</td>
 <td className="px-4 py-3">
  <AdminProfileCompletionHint
   user={user}
   labels={labels.onboardingSteps}
   toneClass={completionTone(user.completionPercent)}
  />
 </td>
 <td className="px-4 py-3">
  <AdminUserTierSelect
   user={user}
   tierLabels={labels.tierLabels}
   tierToneClass={tierTone(user.effectiveTier, user.isExpired)}
   labels={labels.tierChange}
   onChanged={() => onUserUpdated?.()}
  />
 </td>
 <td className="px-4 py-3 tabular-nums font-semibold text-emerald-800">
 {user.validatedArticles}
 </td>
 <td className="px-4 py-3 tabular-nums text-ns-tertiary">
 {user.postsRemaining ?? "-"}
 </td>
<td className="min-w-[12rem] max-w-[16rem] whitespace-normal break-words px-4 py-3 align-top text-xs leading-snug text-ns-secondary">
{user.blockReason
? labels.blockCodes[user.blockReason] ?? user.blockReason
: labels.noBlock}
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
 <td className="px-4 py-3 align-top">
 <div className="flex min-w-[8.5rem] flex-col gap-2">
  <AdminUserControlAction
   user={user}
   currentAdminUserId={currentAdminUserId}
   labels={labels.control}
   onChanged={() => onUserUpdated?.()}
  />
  {isSelf ? (
   <span className="text-xs text-ns-alternate">{labels.deleteSelf}</span>
  ) : confirming ? (
   <div className="flex flex-col gap-1.5 border-t border-ns-alternate/40 pt-2">
    <p className="max-w-[12rem] text-xs text-ns-secondary">
     {labels.confirmDelete}
    </p>
    <div className="flex flex-wrap gap-1.5">
     <button
      type="button"
      disabled={deleting}
      onClick={() => void onDeleteUser(user.userId)}
      className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
     >
      {deleting ? labels.deleting : labels.confirm}
     </button>
     <button
      type="button"
      disabled={deleting}
      onClick={() => setConfirmUserId(null)}
      className="rounded-md border border-ns-alternate px-2.5 py-1 text-xs font-semibold text-ns-secondary hover:bg-white"
     >
      {labels.cancel}
     </button>
    </div>
   </div>
  ) : (
   <button
    type="button"
    onClick={() => {
     setDeleteError(null);
     setConfirmUserId(user.userId);
    }}
    className="text-left text-xs font-semibold text-red-700 hover:text-red-900 hover:underline"
   >
    {labels.delete}
   </button>
  )}
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 {deleteError ? (
 <p className="border-t border-ns-alternate/50 px-5 py-3 text-sm text-red-600">
 {deleteError}
 </p>
 ) : null}
 </section>
 );
}
