import type { LlmProvider } from "@/types/workspace";

export const LLM_PROVIDERS: LlmProvider[] = [
  "openai",
  "perplexity",
  "anthropic",
  "google",
];

export type LlmProviderGuide = {
  name: string;
  link: string;
  linkLabel: string;
  keyPlaceholder: string;
  steps: string[];
};

type LlmSetupTranslator = {
  (key: string): string;
  raw: (key: string) => unknown;
};

export function getLlmProviderGuide(
  provider: LlmProvider,
  t: LlmSetupTranslator,
): LlmProviderGuide {
  return {
    name: t(`providers.${provider}.name`),
    steps: t.raw(`providers.${provider}.steps`) as string[],
    link: t(`providers.${provider}.link`),
    linkLabel: t(`providers.${provider}.linkLabel`),
    keyPlaceholder: t(`providers.${provider}.keyPlaceholder`),
  };
}

/** Error codes where a direct link to the user's LLM provider console helps. */
export function shouldShowLlmProviderConsole(errorCode?: string): boolean {
  if (!errorCode) return false;
  return (
    errorCode === "llm_request_failed" ||
    errorCode === "invalid_api_key" ||
    errorCode === "insufficient_credits" ||
    errorCode === "verify_failed" ||
    errorCode === "no_llm_key" ||
    errorCode === "rate_limit" ||
    errorCode === "timeout"
  );
}
