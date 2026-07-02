/** Env keys used as platform fallback — must never be shown or stored as user BYOK. */
export function getPlatformApiKeySet(): Set<string> {
  const keys = [
    process.env.OPENAI_API_KEY,
    process.env.ANTHROPIC_API_KEY,
    process.env.PERPLEXITY_API_KEY,
    process.env.GOOGLE_API_KEY,
  ]
    .map((k) => k?.trim())
    .filter((k): k is string => Boolean(k));
  return new Set(keys);
}

export function isPlatformApiKey(key: string | null | undefined): boolean {
  const trimmed = key?.trim();
  if (!trimmed) return false;
  return getPlatformApiKeySet().has(trimmed);
}
