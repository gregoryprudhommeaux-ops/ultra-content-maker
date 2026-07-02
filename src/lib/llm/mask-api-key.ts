import type { SubscriptionAccess } from "@/types/subscription";
import type { LlmProvider } from "@/types/workspace";

export const API_KEY_MASK = "••••••••••••••••";

/** Tiers where the account panel never reveals key material (always masked). */
export function tierAlwaysMasksApiKey(access: SubscriptionAccess | null): boolean {
  if (!access) return true;
  const tier = access.effectiveTier;
  return (
    tier === "free_test" ||
    tier === "full_free" ||
    tier === "pro_plus" ||
    tier === "free_without_api" ||
    tier === "support_starter" ||
    tier === "support_regular" ||
    tier === "support_total" ||
    access.isTrialActive
  );
}

export function formatAccountApiKeyDisplay(input: {
  provider: LlmProvider | null;
  hasUserKey: boolean;
  usesPlatformLlm: boolean;
  providerLabel: string | null;
  labels: {
    platform: string;
    notConfigured: string;
    masked: string;
  };
}): string {
  if (input.hasUserKey) {
    return input.providerLabel
      ? `${input.providerLabel} · ${API_KEY_MASK}`
      : input.labels.masked;
  }
  if (input.usesPlatformLlm) return input.labels.platform;
  return input.labels.notConfigured;
}
