import { configFromUserLlm, getPlatformLlmConfig, type LlmConfig } from "@/lib/llm/config";
import { isPlatformApiKey } from "@/lib/llm/platform-key.server";
import {
  readUserLlmProfileServer,
  isUserProvidedLlmKey,
} from "@/lib/llm/user-llm-profile.server";
import { resolveRequestLlm, type RequestLlmInput } from "@/lib/llm/resolve-request-llm";
import { getSubscriptionProfileServer } from "@/lib/subscription/subscription.server";
import { resolveSubscriptionAccess } from "@/lib/subscription/access";
import { tierForbiddenUserApiKey, userApiKeyAllowedForTier } from "@/lib/subscription/constants";
import type { SubscriptionAccess } from "@/types/subscription";
import type { LlmProvider } from "@/types/workspace";

/** All platform env keys configured (OpenAI → Anthropic → Perplexity → Google). */
export function getAllPlatformLlmConfigs(): LlmConfig[] {
  const providers: { key?: string; provider: LlmProvider }[] = [
    { key: process.env.OPENAI_API_KEY?.trim(), provider: "openai" },
    { key: process.env.ANTHROPIC_API_KEY?.trim(), provider: "anthropic" },
    { key: process.env.PERPLEXITY_API_KEY?.trim(), provider: "perplexity" },
    { key: process.env.GOOGLE_API_KEY?.trim(), provider: "google" },
  ];
  const out: LlmConfig[] = [];
  for (const { key, provider } of providers) {
    if (key && key.length >= 8) {
      out.push(configFromUserLlm({ provider, apiKey: key }));
    }
  }
  return out;
}

async function resolveOptionalUserByok(
  userId: string,
  bodyLlm?: RequestLlmInput,
): Promise<LlmConfig | null> {
  const bodyKey = bodyLlm?.apiKey?.trim() ?? "";
  if (bodyKey && !isPlatformApiKey(bodyKey)) {
    return configFromUserLlm({
      provider: bodyLlm?.provider ?? "openai",
      apiKey: bodyKey,
      model: bodyLlm?.model,
    });
  }

  const profile = await readUserLlmProfileServer(userId);
  if (isUserProvidedLlmKey(profile)) {
    return configFromUserLlm({
      provider: profile!.provider ?? "openai",
      apiKey: profile!.apiKey.trim(),
      model: profile?.model,
    });
  }

  return null;
}

/**
 * Resolves LLM for content API routes.
 * Platform-included tiers (trial, Pro+, Support) always prefer the platform env key.
 * Pro / free_without_api require the user's own key.
 */
export async function resolveContentRouteLlm(
  userId: string,
  bodyLlm?: RequestLlmInput,
  access?: SubscriptionAccess | null,
): Promise<LlmConfig | null> {
  const subAccess =
    access ?? resolveSubscriptionAccess(await getSubscriptionProfileServer(userId));

  if (subAccess.canUseOwnLlmOnly) {
    return resolveRequestLlm(userId, bodyLlm);
  }

  if (subAccess.canUsePlatformLlm) {
    const platform = getPlatformLlmConfig();
    if (platform) return platform;
    if (tierForbiddenUserApiKey(subAccess.effectiveTier)) {
      return null;
    }
  }

  return resolveRequestLlm(userId, bodyLlm);
}

/** Optional BYOK fallback when platform LLM fails (free trial only). */
export async function resolveContentRouteByokFallback(
  userId: string,
  bodyLlm?: RequestLlmInput,
  access?: SubscriptionAccess | null,
): Promise<LlmConfig | null> {
  const subAccess =
    access ?? resolveSubscriptionAccess(await getSubscriptionProfileServer(userId));
  if (!userApiKeyAllowedForTier(subAccess.effectiveTier)) return null;
  if (subAccess.canUseOwnLlmOnly) return null;
  return resolveOptionalUserByok(userId, bodyLlm);
}

export function isPlatformManagedLlmUser(access: SubscriptionAccess | null): boolean {
  if (!access) return false;
  return (
    (access.canUsePlatformLlm && !access.canUseOwnLlmOnly) ||
    tierForbiddenUserApiKey(access.effectiveTier)
  );
}
