import type { SubscriptionAccess } from "@/types/subscription";
import { getSubscriptionAccessServer } from "./subscription.server";

export type LlmGateResult =
  | { ok: true; access: SubscriptionAccess }
  | { ok: false; status: number; code: string; access: SubscriptionAccess };

/** Blocks expired subscriptions from any LLM route. */
export async function requireActiveSubscriptionLlm(
  uid: string,
  opts?: { isPlatformAdmin?: boolean; premium?: boolean },
): Promise<LlmGateResult> {
  const access = await getSubscriptionAccessServer(uid, opts);
  if (access.isExpired) {
    return {
      ok: false,
      status: 402,
      code: "subscription_expired",
      access,
    };
  }
  if (opts?.premium && !access.canUseRework) {
    return {
      ok: false,
      status: 402,
      code: "premium_required",
      access,
    };
  }
  return { ok: true, access };
}
