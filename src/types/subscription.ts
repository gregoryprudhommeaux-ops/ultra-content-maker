/** Commercial tiers · see lib/subscription/constants.ts for limits & pricing. */
export type SubscriptionTier =
 | "free_test"
 | "pro"
 | "pro_plus"
 | "support_starter"
 | "support_regular"
 | "support_total"
 | "full_free"
 | "free_without_api"
 | "expired";

export type SupportTier = "starter" | "regular";

export type ActivationMethod = "trial_auto" | "coupon" | "admin" | "stripe" | "paypal" | "wire";

export type SubscriptionProfile = {
 tier: SubscriptionTier;
 /** Set when the first post is generated (starts 15-day window). */
 trialStartedAt?: string;
 trialPostsUsed: number;
 trialExpiresAt?: string;
 /** Retained posts this month (Pro). */
 proPostsUsedThisMonth: number;
 proPeriodStart?: string;
 proPlusPostsUsedThisMonth: number;
 /** Admin-granted extra posts for current Pro+ period. */
 proPlusBonusPosts: number;
 proPlusPeriodStart?: string;
 supportTier?: SupportTier;
 activatedAt?: string;
 activationMethod?: ActivationMethod;
 /** Admin uid that granted full_free (uses that admin's Firestore LLM key). */
 fullFreeGrantedByAdminUid?: string;
 /** Stripe Customer ID · populated when billing goes live. */
 stripeCustomerId?: string | null;
 stripeSubscriptionId?: string | null;
 /** Wire billing: paid through end of this instant (UTC). Grace +7 days after. */
 wireCoverageEnd?: string;
 wirePreferredCurrency?: "eur" | "mxn";
 wirePlan?: "pro" | "pro_plus";
 /** ISO date (YYYY-MM-DD) of coverage end when grace reminder was sent. */
 wireGraceReminderFor?: string;
};

export type SubscriptionAccess = {
 tier: SubscriptionTier;
 effectiveTier: SubscriptionTier;
 isTrialActive: boolean;
 isExpired: boolean;
 isSupportClient: boolean;
 canUsePlatformLlm: boolean;
 canUseOwnLlmOnly: boolean;
 canGenerate: boolean;
 canExportLinkedIn: boolean;
 canViewFullPersona: boolean;
 canViewPersonaSummary: boolean;
 canUseRework: boolean;
 canUseNews: boolean;
 trialPostsRemaining: number;
 trialDaysRemaining: number | null;
 proPostsRemaining: number | null;
 proPlusPostsRemaining: number | null;
 /** Posts left to retain this period (trial credits or monthly quota). */
 postsRemaining: number | null;
 /** Human-readable block reason for UI. */
 blockReason?:
  | "trial_expired"
  | "trial_posts_exhausted"
  | "subscription_required"
  | "pro_cap"
  | "pro_plus_cap"
  | "support_no_generate"
  | "wire_payment_overdue";
};

export type TierQuizAnswer = "has_api_key" | "no_api_key" | "want_done_for_you";
