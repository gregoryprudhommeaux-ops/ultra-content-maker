import { PRICING, isFreeTestTier, isSupportTier } from "@/lib/subscription/constants";
import type {
  AdminUserMetrics,
  SupportDeliveryStatus,
} from "@/lib/admin/analytics-types";
import type { SubscriptionTier } from "@/types/subscription";
import { supportPostsPerMonth } from "@/lib/subscription/constants";

/** Rough $/retained post for platform-LLM tiers (free test, Pro+, Support). */
export const ESTIMATED_LLM_COST_PER_RETAINED_POST_USD = 0.08;

/**
 * Estimated human production cost per Support post (writing, review, publish).
 * Adjust here for margin estimates — not billed automatically.
 */
export const ESTIMATED_HUMAN_COST_PER_SUPPORT_POST_USD = 30;

export function tierMonthlyRevenueUsd(tier: SubscriptionTier): number {
  switch (tier) {
    case "pro":
      return PRICING.pro.usdMonthly;
    case "pro_plus":
      return PRICING.proPlus.usdMonthly;
    case "support_starter":
      return PRICING.support.starter.usdMonthly;
    case "support_regular":
      return PRICING.support.regular.usdMonthly;
    default:
      return 0;
  }
}

export function usesPlatformLlmTier(tier: SubscriptionTier, isExpired: boolean): boolean {
  if (isExpired) return false;
  return isFreeTestTier(tier) || tier === "pro_plus" || isSupportTier(tier);
}

export type RevenueSummary = {
  mrrUsd: number;
  stripeMrrUsd: number;
  stripeSubscribers: number;
  estimatedLlmCostUsd: number;
  estimatedGrossMarginUsd: number;
  loggedPlatformLlmCostUsd: number;
  countByTier: Record<SubscriptionTier, number>;
};

export function computeRevenueSummary(
  users: AdminUserMetrics[],
  includedUserIds: ReadonlySet<string>,
  loggedPlatformLlmCostUsd = 0,
): RevenueSummary {
  const included = users.filter((u) => includedUserIds.has(u.userId));
  const countByTier = {
    free_test: 0,
    pro: 0,
    pro_plus: 0,
    support_starter: 0,
    support_regular: 0,
    support_total: 0,
    full_free: 0,
    free_without_api: 0,
    expired: 0,
  } satisfies Record<SubscriptionTier, number>;

  let mrrUsd = 0;
  let stripeMrrUsd = 0;
  let stripeSubscribers = 0;
  let estimatedLlmCostUsd = 0;

  for (const user of included) {
    const tier = user.isExpired ? "expired" : user.effectiveTier;
    countByTier[tier] += 1;
    if (!user.isExpired) {
      const revenue = tierMonthlyRevenueUsd(tier);
      mrrUsd += revenue;
      if (user.hasStripeSubscription) {
        stripeMrrUsd += revenue;
        stripeSubscribers += 1;
      }
    }
    if (user.usesPlatformLlm) {
      estimatedLlmCostUsd +=
        user.validatedArticles * ESTIMATED_LLM_COST_PER_RETAINED_POST_USD;
    }
  }

  const platformCost = Math.max(estimatedLlmCostUsd, loggedPlatformLlmCostUsd);

  return {
    mrrUsd,
    stripeMrrUsd,
    stripeSubscribers,
    estimatedLlmCostUsd: platformCost,
    estimatedGrossMarginUsd: mrrUsd - platformCost,
    loggedPlatformLlmCostUsd,
    countByTier,
  };
}

export function computeSupportDeliveryStatus(
  deliveredThisMonth: number,
  monthlyQuota: number,
  now = new Date(),
): SupportDeliveryStatus {
  if (deliveredThisMonth > monthlyQuota) return "over_quota";
  const day = now.getUTCDate();
  const daysInMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const expectedPace = Math.floor((monthlyQuota * day) / daysInMonth);
  if (deliveredThisMonth < expectedPace && day >= 15) return "at_risk";
  return "on_track";
}

export function computeSupportAccountMargin(row: {
  tier: SubscriptionTier;
  deliveredThisMonth: number;
  llmCostUsd: number;
}): {
  revenueUsd: number;
  humanCostUsd: number;
  estimatedMarginUsd: number;
} {
  const revenueUsd = tierMonthlyRevenueUsd(row.tier);
  const humanCostUsd =
    row.deliveredThisMonth * ESTIMATED_HUMAN_COST_PER_SUPPORT_POST_USD;
  const estimatedMarginUsd = revenueUsd - row.llmCostUsd - humanCostUsd;
  return { revenueUsd, humanCostUsd, estimatedMarginUsd };
}

export function buildSupportQuotaFields(
  tier: SubscriptionTier,
  deliveredThisMonth: number,
): {
  monthlyQuota: number;
  remainingQuota: number;
  deliveryStatus: SupportDeliveryStatus;
} {
  const monthlyQuota = supportPostsPerMonth(tier) ?? 0;
  const remainingQuota =
    monthlyQuota === 0 ? 0 : Math.max(0, monthlyQuota - deliveredThisMonth);
  const deliveryStatus =
    monthlyQuota === 0
      ? "on_track"
      : computeSupportDeliveryStatus(deliveredThisMonth, monthlyQuota);
  return { monthlyQuota, remainingQuota, deliveryStatus };
}

export type BlockedUserRow = AdminUserMetrics & { stuckReason: string };

export function listBlockedUsers(
  users: AdminUserMetrics[],
  includedUserIds: ReadonlySet<string>,
  labels: { blocked: string; lowCompletion: string },
): BlockedUserRow[] {
  return users
    .filter((u) => includedUserIds.has(u.userId))
    .filter((u) => {
      if (u.blockReason) return true;
      return u.completionPercent < 40 && u.validatedArticles === 0;
    })
    .map((u) => ({
      ...u,
      stuckReason: u.blockReason
        ? labels.blocked
        : labels.lowCompletion,
    }));
}
