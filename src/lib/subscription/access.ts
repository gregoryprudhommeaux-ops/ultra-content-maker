import { isWireSubscriptionSuspended } from "@/lib/billing/wire-billing";
import {
  PRICING,
  TRIAL_DAYS,
  TRIAL_MAX_POSTS,
  isFreeTestTier,
  isSupportTier,
  tierHasUnlimitedPosts,
  tierRequiresOwnLlm,
  tierUsesPlatformLlm,
} from "./constants";
import type { SubscriptionAccess, SubscriptionProfile, SubscriptionTier } from "@/types/subscription";

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function parseIso(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function currentMonthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function resetMonthlyIfNewPeriod(
  profile: SubscriptionProfile,
  periodStartKey: "proPeriodStart" | "proPlusPeriodStart",
  usedKey: "proPostsUsedThisMonth" | "proPlusPostsUsedThisMonth",
): SubscriptionProfile {
  const period = profile[periodStartKey]?.slice(0, 7);
  const now = currentMonthKey();
  if (period === now) return profile;
  return {
    ...profile,
    [usedKey]: 0,
    [periodStartKey]: new Date().toISOString(),
  };
}

function proCap(profile: SubscriptionProfile): number {
  return PRICING.pro.postsPerMonth;
}

function proPlusCap(profile: SubscriptionProfile): number {
  return PRICING.proPlus.postsPerMonth + (profile.proPlusBonusPosts ?? 0);
}

function isPaidSelfServe(tier: SubscriptionTier): boolean {
  return tier === "pro" || tier === "pro_plus";
}

function hasPremiumFeatures(
  tier: SubscriptionTier,
  isExpired: boolean,
  isTrialActive: boolean,
): boolean {
  if (isExpired || isTrialActive) return false;
  return (
    isPaidSelfServe(tier) ||
    isSupportTier(tier) ||
    tier === "full_free" ||
    tier === "free_without_api"
  );
}

export function defaultSubscriptionProfile(): SubscriptionProfile {
  return {
    tier: "free_test",
    trialPostsUsed: 0,
    proPostsUsedThisMonth: 0,
    proPlusPostsUsedThisMonth: 0,
    proPlusBonusPosts: 0,
  };
}

export function normalizeSubscriptionProfile(raw: unknown): SubscriptionProfile {
  const base = defaultSubscriptionProfile();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const rawTier = r.tier as SubscriptionTier | "trial" | undefined;
  const tierFromDb =
    rawTier === "trial" ? "free_test" : (rawTier as SubscriptionTier | undefined);
  const validTiers: SubscriptionTier[] = [
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
  return {
    tier: validTiers.includes(tierFromDb as SubscriptionTier)
      ? (tierFromDb as SubscriptionTier)
      : "free_test",
    trialStartedAt: typeof r.trialStartedAt === "string" ? r.trialStartedAt : undefined,
    trialPostsUsed: typeof r.trialPostsUsed === "number" ? r.trialPostsUsed : 0,
    trialExpiresAt: typeof r.trialExpiresAt === "string" ? r.trialExpiresAt : undefined,
    proPostsUsedThisMonth: typeof r.proPostsUsedThisMonth === "number" ? r.proPostsUsedThisMonth : 0,
    proPeriodStart: typeof r.proPeriodStart === "string" ? r.proPeriodStart : undefined,
    proPlusPostsUsedThisMonth:
      typeof r.proPlusPostsUsedThisMonth === "number" ? r.proPlusPostsUsedThisMonth : 0,
    proPlusBonusPosts: typeof r.proPlusBonusPosts === "number" ? r.proPlusBonusPosts : 0,
    proPlusPeriodStart:
      typeof r.proPlusPeriodStart === "string" ? r.proPlusPeriodStart : undefined,
    supportTier: r.supportTier === "starter" || r.supportTier === "regular" ? r.supportTier : undefined,
    activatedAt: typeof r.activatedAt === "string" ? r.activatedAt : undefined,
    activationMethod:
      r.activationMethod === "trial_auto" ||
      r.activationMethod === "coupon" ||
      r.activationMethod === "admin" ||
      r.activationMethod === "stripe" ||
      r.activationMethod === "paypal" ||
      r.activationMethod === "wire"
        ? r.activationMethod
        : undefined,
    fullFreeGrantedByAdminUid:
      typeof r.fullFreeGrantedByAdminUid === "string" ? r.fullFreeGrantedByAdminUid : undefined,
    stripeCustomerId:
      typeof r.stripeCustomerId === "string" ? r.stripeCustomerId : r.stripeCustomerId === null ? null : undefined,
    stripeSubscriptionId:
      typeof r.stripeSubscriptionId === "string"
        ? r.stripeSubscriptionId
        : r.stripeSubscriptionId === null
          ? null
          : undefined,
    wireCoverageEnd: typeof r.wireCoverageEnd === "string" ? r.wireCoverageEnd : undefined,
    wirePreferredCurrency:
      r.wirePreferredCurrency === "eur" || r.wirePreferredCurrency === "mxn"
        ? r.wirePreferredCurrency
        : undefined,
    wirePlan: r.wirePlan === "pro" || r.wirePlan === "pro_plus" ? r.wirePlan : undefined,
    wireGraceReminderFor:
      typeof r.wireGraceReminderFor === "string" ? r.wireGraceReminderFor : undefined,
  };
}

export function resolveSubscriptionAccess(
  profile: SubscriptionProfile,
  opts?: { isPlatformAdmin?: boolean; hasLinkedWorkspace?: boolean },
): SubscriptionAccess {
  if (opts?.isPlatformAdmin) {
    return {
      tier: profile.tier,
      effectiveTier: profile.tier === "expired" ? "pro_plus" : profile.tier,
      isTrialActive: false,
      isExpired: false,
      isSupportClient: false,
      canUsePlatformLlm: true,
      canUseOwnLlmOnly: false,
      canGenerate: true,
      canExportLinkedIn: true,
      canViewFullPersona: true,
      canViewPersonaSummary: true,
      canUseRework: true,
      canUseNews: true,
      trialPostsRemaining: TRIAL_MAX_POSTS,
      trialDaysRemaining: null,
      proPostsRemaining: PRICING.pro.postsPerMonth,
      proPlusPostsRemaining: PRICING.proPlus.postsPerMonth,
      postsRemaining: PRICING.proPlus.postsPerMonth,
    };
  }

  let p = profile;
  if (p.tier === "pro") p = resetMonthlyIfNewPeriod(p, "proPeriodStart", "proPostsUsedThisMonth");
  if (p.tier === "pro_plus") {
    p = resetMonthlyIfNewPeriod(p, "proPlusPeriodStart", "proPlusPostsUsedThisMonth");
  }

  let tier = p.tier;
  let blockReason: SubscriptionAccess["blockReason"];
  const now = new Date();

  if (
    (tier === "pro" || tier === "pro_plus") &&
    p.activationMethod === "wire" &&
    isWireSubscriptionSuspended(p, now)
  ) {
    tier = "expired";
    blockReason = "wire_payment_overdue";
  }

  const trialStart = parseIso(p.trialStartedAt);
  const trialEnd = parseIso(p.trialExpiresAt);

  let isTrialActive = isFreeTestTier(tier);
  if (isTrialActive && trialStart) {
    const expiredByTime = trialEnd ? now > trialEnd : daysBetween(trialStart, now) > TRIAL_DAYS;
    const expiredByPosts = p.trialPostsUsed >= TRIAL_MAX_POSTS;
    if (expiredByTime || expiredByPosts) {
      isTrialActive = false;
      tier = "expired";
      blockReason = expiredByPosts ? "trial_posts_exhausted" : "trial_expired";
    }
  }

  const isSupportClient = isSupportTier(tier);

  let proPostsRemaining: number | null = null;
  let proPlusPostsRemaining: number | null = null;
  let postsRemaining: number | null = null;

  if (tierHasUnlimitedPosts(tier)) {
    postsRemaining = null;
  }

  if (tier === "pro") {
    const cap = proCap(p);
    proPostsRemaining = Math.max(0, cap - p.proPostsUsedThisMonth);
    postsRemaining = proPostsRemaining;
    if (proPostsRemaining <= 0) blockReason = "pro_cap";
  }

  if (tier === "pro_plus") {
    const cap = proPlusCap(p);
    proPlusPostsRemaining = Math.max(0, cap - p.proPlusPostsUsedThisMonth);
    postsRemaining = proPlusPostsRemaining;
    if (proPlusPostsRemaining <= 0) blockReason = "pro_plus_cap";
  }

  if (isTrialActive) {
    const trialRem = Math.max(0, TRIAL_MAX_POSTS - p.trialPostsUsed);
    postsRemaining = trialRem;
    if (trialRem <= 0) {
      isTrialActive = false;
      tier = "expired";
      blockReason = "trial_posts_exhausted";
    }
  }

  let canGenerate = tier !== "expired";
  if (isSupportTier(tier)) {
    canGenerate = false;
    blockReason = "support_no_generate";
  } else if (tier === "pro" && (proPostsRemaining ?? 0) <= 0) {
    canGenerate = false;
  } else if (tier === "pro_plus" && (proPlusPostsRemaining ?? 0) <= 0) {
    canGenerate = false;
  } else if (isTrialActive && (postsRemaining ?? 0) <= 0) {
    canGenerate = false;
  }
  // free_without_api: canGenerate gated on resolvable own LLM in requireGenerationAccess

  const finalExpired = tier === "expired";

  const canExportLinkedIn =
    !finalExpired &&
    (isTrialActive ||
      tier === "pro" ||
      tier === "pro_plus" ||
      isSupportTier(tier) ||
      tier === "full_free" ||
      tier === "free_without_api");

  if (finalExpired && !blockReason) {
    blockReason = "subscription_required";
  }

  const premium = hasPremiumFeatures(tier, finalExpired, isTrialActive);
  const canViewFullPersona = premium;
  const canViewPersonaSummary = isTrialActive && !finalExpired;
  const canUseRework = premium;
  const canUseNews = premium;

  const trialPostsRemaining = isTrialActive
    ? Math.max(0, TRIAL_MAX_POSTS - p.trialPostsUsed)
    : 0;

  let trialDaysRemaining: number | null = null;
  if (isTrialActive && trialEnd) {
    trialDaysRemaining = daysBetween(now, trialEnd);
  } else if (isTrialActive && trialStart) {
    const end = new Date(trialStart);
    end.setDate(end.getDate() + TRIAL_DAYS);
    trialDaysRemaining = daysBetween(now, end);
  }

  // TODO: expired archival after 30 days and 6-month profile retention — not implemented yet.

  return {
    tier: profile.tier,
    effectiveTier: tier,
    isTrialActive: isFreeTestTier(tier) && isTrialActive,
    isExpired: finalExpired,
    isSupportClient,
    canUsePlatformLlm: tierUsesPlatformLlm(tier) && !finalExpired,
    canUseOwnLlmOnly: tierRequiresOwnLlm(tier) && !finalExpired,
    canGenerate,
    canExportLinkedIn,
    canViewFullPersona,
    canViewPersonaSummary,
    canUseRework,
    canUseNews,
    trialPostsRemaining,
    trialDaysRemaining,
    proPostsRemaining,
    proPlusPostsRemaining,
    postsRemaining,
    blockReason,
  };
}

/** Starts the 15-day window when the first post is retained (validated). */
export function trialWindowOnFirstRetain(profile: SubscriptionProfile): SubscriptionProfile {
  if (profile.trialStartedAt) return profile;
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + TRIAL_DAYS);
  return {
    ...profile,
    trialStartedAt: start.toISOString(),
    trialExpiresAt: end.toISOString(),
  };
}

/** @deprecated use trialWindowOnFirstRetain */
export function trialWindowOnFirstPost(profile: SubscriptionProfile): SubscriptionProfile {
  return trialWindowOnFirstRetain(profile);
}
