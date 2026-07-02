import { userApiKeyAllowedForTier } from "@/lib/subscription/constants";
import type { SubscriptionAccess, SubscriptionTier } from "@/types/subscription";
import type { LlmProvider, UserLlmProfile } from "@/types/workspace";

/** Optional LLM payload for API routes (never sends platform or non-user keys). */
export function llmPayloadFromProfile(
  profile: UserLlmProfile | null | undefined,
  opts?: { includeUserKey?: boolean },
): { provider: LlmProvider; apiKey?: string; model?: string } | undefined {
  if (!profile) return undefined;
  const includeUserKey = opts?.includeUserKey !== false;
  const apiKey =
    includeUserKey && profile.userProvided === true ? profile.apiKey?.trim() : "";
  return {
    provider: profile.provider,
    ...(apiKey ? { apiKey } : {}),
    model: profile.model,
  };
}

/** Respects tier rules: Pro+ / Support never send a user key (platform AI only). */
export function llmPayloadForTier(
  profile: UserLlmProfile | null | undefined,
  tier?: SubscriptionTier,
): ReturnType<typeof llmPayloadFromProfile> {
  return llmPayloadFromProfile(profile, {
    includeUserKey: tier ? userApiKeyAllowedForTier(tier) : true,
  });
}

/** Platform-included tiers never send a stale client-side BYOK key. */
export function llmPayloadForAccess(
  profile: UserLlmProfile | null | undefined,
  access?: Pick<SubscriptionAccess, "canUsePlatformLlm" | "canUseOwnLlmOnly" | "effectiveTier"> | null,
): ReturnType<typeof llmPayloadFromProfile> {
  if (access?.canUsePlatformLlm && !access.canUseOwnLlmOnly) {
    return profile ? { provider: profile.provider, model: profile.model } : undefined;
  }
  return llmPayloadForTier(profile, access?.effectiveTier);
}

/** Server-authoritative LLM payload for authenticated API calls. */
export async function fetchServerLlmPayload(
  token: string,
): Promise<{ provider: LlmProvider; apiKey?: string; model?: string } | undefined> {
  const res = await fetch("/api/llm/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return undefined;

  const data = (await res.json()) as {
    provider?: LlmProvider;
    apiKey?: string;
    hasUserKey?: boolean;
    canUsePlatformLlm?: boolean;
    canUseOwnLlmOnly?: boolean;
  };

  const provider = data.provider ?? "openai";
  const apiKey = typeof data.apiKey === "string" ? data.apiKey.trim() : "";

  if (data.hasUserKey && apiKey) {
    return { provider, apiKey };
  }

  if (data.canUsePlatformLlm) {
    return { provider };
  }

  return undefined;
}
