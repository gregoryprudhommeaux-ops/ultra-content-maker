import type { LlmProvider, UserLlmProfile } from "@/types/workspace";

/** Optional LLM payload for API routes (key omitted when unreadable client-side). */
export function llmPayloadFromProfile(
  profile: UserLlmProfile | null | undefined,
): { provider: LlmProvider; apiKey?: string; model?: string } | undefined {
  if (!profile) return undefined;
  const apiKey = profile.apiKey?.trim();
  return {
    provider: profile.provider,
    ...(apiKey ? { apiKey } : {}),
    model: profile.model,
  };
}
