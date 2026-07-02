import {
  ARTICLE_CREATION_MODES,
  emptyCreationModeCounts,
} from "@/lib/articles/infer-creation-mode";
import type { AdminUserMetrics, ConnectionBucket } from "@/lib/admin/analytics-types";
import type { ArticleCreationMode } from "@/types/workspace";

export type FilteredAdminTotals = {
  registeredUsers: number;
  workspaceAccounts: number;
  totalArticles: number;
  draftArticles: number;
  reworkedArticles: number;
  validatedArticles: number;
  averageCompletionPercent: number;
  articleModeCounts: Record<ArticleCreationMode, number>;
};

export function aggregateAdminStats(
  users: AdminUserMetrics[],
  includedUserIds: ReadonlySet<string>,
): FilteredAdminTotals {
  const included = users.filter((user) => includedUserIds.has(user.userId));
  const articleModeCounts = emptyCreationModeCounts();
  let workspaceAccounts = 0;
  let totalArticles = 0;
  let draftArticles = 0;
  let reworkedArticles = 0;
  let validatedArticles = 0;
  let completionSum = 0;

  for (const user of included) {
    workspaceAccounts += user.accountCount;
    totalArticles += user.totalArticles;
    draftArticles += user.draftArticles;
    reworkedArticles += user.reworkedArticles;
    validatedArticles += user.validatedArticles;
    completionSum += user.completionPercent;
    for (const mode of ARTICLE_CREATION_MODES) {
      articleModeCounts[mode] += user.articleModeCounts[mode];
    }
  }

  return {
    registeredUsers: included.length,
    workspaceAccounts,
    totalArticles,
    draftArticles,
    reworkedArticles,
    validatedArticles,
    averageCompletionPercent:
      included.length > 0 ? Math.round(completionSum / included.length) : 0,
    articleModeCounts,
  };
}

/** Recompute connection buckets for included users only. */
export function filterConnectionBuckets(
  buckets: ConnectionBucket[],
  includedUserIds: ReadonlySet<string>,
): ConnectionBucket[] {
  return buckets.map((bucket) => {
    const filteredIds = bucket.userIds.filter((id) => includedUserIds.has(id));
    return {
      ...bucket,
      userIds: filteredIds,
      uniqueUsers: filteredIds.length,
    };
  });
}

export { computeRevenueSummary, listBlockedUsers } from "@/lib/admin/admin-economics";
export type { RevenueSummary, BlockedUserRow } from "@/lib/admin/admin-economics";
