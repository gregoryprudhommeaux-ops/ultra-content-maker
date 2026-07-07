import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  defaultSubscriptionProfile,
  normalizeSubscriptionProfile,
  resolveSubscriptionAccess,
  trialWindowOnFirstRetain,
} from "./access";
import {
  defaultSupportProposalForTier,
  isSupportTier,
  tierHasUnlimitedPosts,
} from "./constants";
import type {
  ActivationMethod,
  SubscriptionAccess,
  SubscriptionProfile,
  SubscriptionTier,
  SupportContract,
  SupportProposal,
} from "@/types/subscription";
import { FieldValue } from "firebase-admin/firestore";

function userRef(uid: string) {
  const db = getAdminFirestore();
  if (!db) throw new Error("admin_firestore_unavailable");
  return db.doc(`users/${uid}`);
}

export async function getSubscriptionProfileServer(uid: string): Promise<SubscriptionProfile> {
  const db = getAdminFirestore();
  if (!db) return defaultSubscriptionProfile();
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) return defaultSubscriptionProfile();
  return normalizeSubscriptionProfile(snap.data()?.subscription);
}

export async function getSubscriptionAccessServer(
  uid: string,
  opts?: { isPlatformAdmin?: boolean; hasLinkedWorkspace?: boolean },
): Promise<SubscriptionAccess> {
  const profile = await getSubscriptionProfileServer(uid);
  return resolveSubscriptionAccess(profile, opts);
}

export async function setSubscriptionProfileServer(
  uid: string,
  patch: Partial<SubscriptionProfile>,
): Promise<SubscriptionProfile> {
  const current = await getSubscriptionProfileServer(uid);
  const next: SubscriptionProfile = { ...current };
  const subscriptionWrite: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(patch)) {
    const field = key as keyof SubscriptionProfile;
    if (value === undefined) {
      delete next[field];
      subscriptionWrite[key] = FieldValue.delete();
    } else {
      (next as Record<string, unknown>)[key] = value;
      subscriptionWrite[key] = value;
    }
  }

  await userRef(uid).set(
    { subscription: subscriptionWrite, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  return next;
}

export async function activateTierServer(
  uid: string,
  tier: SubscriptionTier,
  method: ActivationMethod,
  opts?: {
    grantedByAdminUid?: string;
    supportProposal?: SupportProposal;
    supportContract?: SupportContract;
  },
): Promise<SubscriptionProfile> {
  const now = new Date().toISOString();
  const patch: Partial<SubscriptionProfile> = {
    tier,
    activatedAt: now,
    activationMethod: method,
  };
  if (tier === "pro") {
    patch.proPostsUsedThisMonth = 0;
    patch.proPeriodStart = now;
  }
  if (tier === "pro_plus") {
    patch.proPlusPostsUsedThisMonth = 0;
    patch.proPlusPeriodStart = now;
  }
  if (isSupportTier(tier)) {
    if (tier === "support_starter") {
      patch.supportTier = "starter";
    } else if (tier === "support_regular") {
      patch.supportTier = "regular";
    } else {
      patch.supportTier = undefined;
    }
    patch.supportProposal =
      opts?.supportProposal ?? defaultSupportProposalForTier(tier);
    patch.supportContract = opts?.supportContract;
  } else {
    patch.supportTier = undefined;
    patch.supportProposal = undefined;
    patch.supportContract = undefined;
  }
  if (tier === "free_test") {
    patch.trialPostsUsed = 0;
    patch.freeArticleFeedbackUsed = 0;
    patch.trialStartedAt = undefined;
    patch.trialExpiresAt = undefined;
  }
  if (tier === "full_free") {
    patch.fullFreeGrantedByAdminUid = opts?.grantedByAdminUid;
  } else {
    patch.fullFreeGrantedByAdminUid = undefined;
  }
  if (tier === "expired") {
    patch.trialStartedAt = patch.trialStartedAt ?? now;
    patch.trialExpiresAt = now;
  }
  return setSubscriptionProfileServer(uid, patch);
}

/** Consumes one credit when a post is retained (validated). */
export async function recordRetainedPostServer(uid: string): Promise<SubscriptionProfile> {
  const current = await getSubscriptionProfileServer(uid);
  if (tierHasUnlimitedPosts(current.tier)) {
    return current;
  }

  let next = current;

  if (next.tier === "free_test") {
    next = trialWindowOnFirstRetain(next);
    next = {
      ...next,
      trialPostsUsed: (next.trialPostsUsed ?? 0) + 1,
    };
  } else if (next.tier === "pro") {
    next = {
      ...next,
      proPostsUsedThisMonth: (next.proPostsUsedThisMonth ?? 0) + 1,
      proPeriodStart: next.proPeriodStart ?? new Date().toISOString(),
    };
  } else if (next.tier === "pro_plus") {
    next = {
      ...next,
      proPlusPostsUsedThisMonth: (next.proPlusPostsUsedThisMonth ?? 0) + 1,
      proPlusPeriodStart: next.proPlusPeriodStart ?? new Date().toISOString(),
    };
  } else {
    return current;
  }

  await userRef(uid).set(
    { subscription: next, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  return next;
}

/** Consumes one free-trial article feedback credit after a successful revise. */
export async function recordArticleFeedbackServer(uid: string): Promise<SubscriptionProfile> {
  const current = await getSubscriptionProfileServer(uid);
  const access = resolveSubscriptionAccess(current);
  if (access.canUseRework || !access.canApplyArticleFeedback) {
    return current;
  }

  const next = {
    ...current,
    freeArticleFeedbackUsed: (current.freeArticleFeedbackUsed ?? 0) + 1,
  };

  await userRef(uid).set(
    {
      subscription: { freeArticleFeedbackUsed: next.freeArticleFeedbackUsed },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return next;
}

/** @deprecated Use recordRetainedPostServer */
export async function recordTrialPostServer(uid: string): Promise<SubscriptionProfile> {
  return recordRetainedPostServer(uid);
}

/** @deprecated Use recordRetainedPostServer */
export async function recordProPlusPostServer(uid: string): Promise<SubscriptionProfile> {
  return recordRetainedPostServer(uid);
}

export async function addProPlusBonusPostsServer(uid: string, bonus: number): Promise<SubscriptionProfile> {
  const current = await getSubscriptionProfileServer(uid);
  return setSubscriptionProfileServer(uid, {
    proPlusBonusPosts: Math.max(0, (current.proPlusBonusPosts ?? 0) + bonus),
  });
}

export type SubscriptionGateResult =
  | { ok: true; access: SubscriptionAccess }
  | { ok: false; status: number; code: string; access: SubscriptionAccess };

export async function requireGenerationAccess(
  uid: string,
  opts?: { isPlatformAdmin?: boolean; hasLinkedWorkspace?: boolean },
): Promise<SubscriptionGateResult> {
  const access = await getSubscriptionAccessServer(uid, opts);

  if (access.effectiveTier === "free_without_api") {
    const { userHasResolvableLlm } = await import("@/lib/llm/resolve-request-llm");
    const hasLlm = await userHasResolvableLlm(uid);
    if (!hasLlm) {
      return {
        ok: false,
        status: 402,
        code: "own_llm_required",
        access: { ...access, canGenerate: false },
      };
    }
  }

  if (!access.canGenerate) {
    const code =
      access.blockReason === "pro_plus_cap"
        ? "pro_plus_cap"
        : access.blockReason === "pro_cap"
          ? "pro_cap"
          : access.blockReason === "support_no_generate"
            ? "support_no_generate"
            : access.isExpired
              ? "subscription_expired"
              : "subscription_required";
    return { ok: false, status: 402, code, access };
  }
  return { ok: true, access };
}

export async function requireRetainedPostAccess(
  uid: string,
  opts?: { isPlatformAdmin?: boolean; hasLinkedWorkspace?: boolean },
): Promise<SubscriptionGateResult> {
  return requireGenerationAccess(uid, opts);
}
