import type { SubscriptionTier, SupportProposal, SupportTier } from "@/types/subscription";

/** Monthly retained-post quota shared by Pro and Pro+. */
export const SELF_SERVE_POSTS_PER_MONTH = 20;

export const PRICING = {
  pro: { usdMonthly: 19, postsPerMonth: SELF_SERVE_POSTS_PER_MONTH },
  proPlus: { usdMonthly: 33, postsPerMonth: SELF_SERVE_POSTS_PER_MONTH },
  support: {
    starter: { usdMonthly: 199, postsPerMonth: 2, minMonths: 3 },
    regular: { usdMonthly: 349, postsPerWeek: 1, minMonths: 3 },
  },
} as const;

export const TRIAL_MAX_POSTS = 4;
export const TRIAL_DAYS = 15;

export const ALL_SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  "free_test",
  "pro",
  "pro_plus",
  "support_starter",
  "support_regular",
  "support_total",
  "full_free",
  "free_without_api",
  "expired",
];

/** Tiers only assignable by platform admins (not self-service checkout). */
export const ADMIN_ONLY_TIERS: SubscriptionTier[] = ["full_free"];

export const TIER_LABEL_KEYS: Record<SubscriptionTier, string> = {
  free_test: "freeTest",
  pro: "pro",
  pro_plus: "proPlus",
  support_starter: "supportStarter",
  support_regular: "supportRegular",
  support_total: "supportTotal",
  full_free: "fullFree",
  free_without_api: "freeWithoutApi",
  expired: "expired",
};

export function isFreeTestTier(tier: SubscriptionTier): boolean {
  return tier === "free_test";
}

export function isSupportTier(tier: SubscriptionTier): boolean {
  return tier === "support_starter" || tier === "support_regular" || tier === "support_total";
}

export function tierHasUnlimitedPosts(tier: SubscriptionTier): boolean {
  return tier === "full_free" || tier === "free_without_api" || tier === "support_total";
}

export function supportPostsPerMonth(tier: SubscriptionTier): number | null {
  if (tier === "support_starter") return PRICING.support.starter.postsPerMonth;
  if (tier === "support_regular") return 4;
  if (tier === "support_total") return null;
  return null;
}

export function tierUsesPlatformLlm(tier: SubscriptionTier): boolean {
  return isFreeTestTier(tier) || tier === "pro_plus" || isSupportTier(tier);
}

export function tierRequiresOwnLlm(tier: SubscriptionTier): boolean {
  return tier === "pro" || tier === "free_without_api";
}

/** Pro+ and Support tiers include platform AI — BYOK is Pro-only (see upgrade quiz). */
export function tierForbiddenUserApiKey(tier: SubscriptionTier): boolean {
  return tier === "pro_plus" || isSupportTier(tier);
}

export function userApiKeyAllowedForTier(tier: SubscriptionTier): boolean {
  return !tierForbiddenUserApiKey(tier);
}

export function normalizePaidTier(
  raw: string,
): SubscriptionTier | null {
  if (raw === "pro" || raw === "pro_plus") return raw;
  if (raw === "support_starter" || raw === "support_regular" || raw === "support_total") return raw;
  if (raw === "support" || raw === "starter") return "support_starter";
  if (raw === "regular" || raw === "weekly") return "support_regular";
  return null;
}

/** Resolve tier slug from admin API / legacy aliases. */
export function normalizeAdminTier(raw: string): SubscriptionTier | null {
  if (raw === "trial") return "free_test";
  if ((ALL_SUBSCRIPTION_TIERS as readonly string[]).includes(raw)) {
    return raw as SubscriptionTier;
  }
  return normalizePaidTier(raw);
}

export function supportTierFromSubscription(tier: SubscriptionTier): SupportTier | null {
  if (tier === "support_starter") return "starter";
  if (tier === "support_regular") return "regular";
  return null;
}

export function supportTierFromRhythm(
  rhythm: "starter" | "regular" | "much_more",
): SubscriptionTier {
  if (rhythm === "starter") return "support_starter";
  if (rhythm === "regular") return "support_regular";
  return "support_total";
}

export function supportRhythmFromTier(
  tier: SubscriptionTier,
): "starter" | "regular" | "much_more" | null {
  if (tier === "support_starter") return "starter";
  if (tier === "support_regular") return "regular";
  if (tier === "support_total") return "much_more";
  return null;
}

export function defaultSupportProposalForTier(tier: SubscriptionTier): SupportProposal | undefined {
  if (tier === "support_starter") return { rhythm: "starter" };
  if (tier === "support_regular") return { rhythm: "regular" };
  return undefined;
}
