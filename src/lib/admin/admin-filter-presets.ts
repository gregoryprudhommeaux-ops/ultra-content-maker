import type { AdminUserMetrics } from "@/lib/admin/analytics-types";

export type AdminFilterPreset = "product" | "trial" | "paying" | "blocked" | "support";

export function applyAdminFilterPreset(
  users: AdminUserMetrics[],
  preset: AdminFilterPreset,
): Set<string> {
  const ids = users
    .filter((user) => {
      switch (preset) {
        case "product":
          return !user.excludeFromStatsDefault;
        case "trial":
          return !user.isExpired && user.effectiveTier === "free_test";
        case "paying":
          return (
            !user.isExpired &&
            (user.effectiveTier === "pro" ||
              user.effectiveTier === "pro_plus" ||
              user.effectiveTier === "support_starter" ||
              user.effectiveTier === "support_regular" ||
              user.effectiveTier === "support_total")
          );
        case "blocked":
          return (
            Boolean(user.blockReason) ||
            (user.completionPercent < 40 && user.validatedArticles === 0)
          );
        case "support":
          return (
            user.effectiveTier === "support_starter" ||
            user.effectiveTier === "support_regular" ||
            user.effectiveTier === "support_total"
          );
        default:
          return true;
      }
    })
    .map((user) => user.userId);
  return new Set(ids);
}

export function countUsersForPreset(
  users: AdminUserMetrics[],
  preset: AdminFilterPreset,
): number {
  return applyAdminFilterPreset(users, preset).size;
}

export function usersToCsv(
  users: AdminUserMetrics[],
  includedUserIds: ReadonlySet<string>,
  headers: Record<string, string>,
): string {
  const included = users.filter((u) => includedUserIds.has(u.userId));
  const columns = [
    "email",
    "displayName",
    "tier",
    "completionPercent",
    "validatedArticles",
    "postsRemaining",
    "blockReason",
    "draftArticles",
    "totalArticles",
    "lastLoginAt",
    "createdAt",
  ] as const;

  const escape = (value: string | number | null | undefined) => {
    const raw = value == null ? "" : String(value);
    if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
    return raw;
  };

  const lines = [
    columns.map((key) => headers[key] ?? key).join(","),
    ...included.map((user) =>
      [
        user.email,
        user.displayName ?? "",
        user.isExpired ? "expired" : user.effectiveTier,
        user.completionPercent,
        user.validatedArticles,
        user.postsRemaining ?? "",
        user.blockReason ?? "",
        user.draftArticles,
        user.totalArticles,
        user.lastLoginAt ?? "",
        user.createdAt ?? "",
      ]
        .map(escape)
        .join(","),
    ),
  ];

  return lines.join("\n");
}
