import { activateTierServer } from "@/lib/subscription/subscription.server";
import type { SubscriptionProfile, SubscriptionTier } from "@/types/subscription";

/** Dev / manual coupons · replace with Firestore + Stripe webhooks in production billing. */
const STATIC_COUPONS: Record<string, SubscriptionTier> = {
 UCM_PRO: "pro",
 UCM_PROPLUS: "pro_plus",
 UCM_SUPPORT_START: "support_starter",
 UCM_SUPPORT_REG: "support_regular",
};

export type RedeemResult =
 | { ok: true; tier: SubscriptionTier; profile: SubscriptionProfile }
 | { ok: false; error: string; status: number };

export async function redeemCouponServer(
 uid: string,
 rawCode: string,
 _suggestedPlan?: "pro" | "pro_plus",
): Promise<RedeemResult> {
 const code = rawCode.toUpperCase().replace(/\s+/g, "");
 const tier = STATIC_COUPONS[code];

 if (!tier) {
 return { ok: false, error: "invalid", status: 400 };
 }

 const profile = await activateTierServer(uid, tier, "coupon");
 return { ok: true, tier, profile };
}
