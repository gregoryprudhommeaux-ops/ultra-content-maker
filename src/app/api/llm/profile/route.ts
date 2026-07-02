import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { isUserProvidedLlmKey, readUserLlmProfileServer } from "@/lib/llm/user-llm-profile.server";
import { userApiKeyAllowedForTier } from "@/lib/subscription/constants";
import { getSubscriptionAccessServer } from "@/lib/subscription/subscription.server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const uid = await verifyBearerUserId(request.headers.get("authorization"));
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const profile = await readUserLlmProfileServer(uid);
  const access = await getSubscriptionAccessServer(uid);
  const byokAllowed = userApiKeyAllowedForTier(access.effectiveTier);
  const hasUserKey = byokAllowed && isUserProvidedLlmKey(profile);

  return NextResponse.json({
    provider: profile?.provider ?? "openai",
    hasUserKey,
    apiKey: hasUserKey ? profile!.apiKey : "",
    canUsePlatformLlm: access?.canUsePlatformLlm ?? false,
    canUseOwnLlmOnly: access?.canUseOwnLlmOnly ?? false,
    userApiKeyAllowed: byokAllowed,
  });
}
