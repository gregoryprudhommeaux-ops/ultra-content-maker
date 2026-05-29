import type { LlmProvider } from "@/types/workspace";
import { defaultModelForProvider } from "@/lib/llm/providers";

export type LlmConfig = {
  provider: LlmProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  supportsJsonMode: boolean;
};

export function configFromUserLlm(input: {
  provider: LlmProvider;
  apiKey: string;
  model?: string;
}): LlmConfig {
  const provider = input.provider;
  const model = input.model?.trim() || defaultModelForProvider(provider);

  switch (provider) {
    case "perplexity":
      return {
        provider,
        apiKey: input.apiKey,
        baseUrl: "https://api.perplexity.ai",
        model,
        supportsJsonMode: true,
      };
    case "anthropic":
      return {
        provider,
        apiKey: input.apiKey,
        baseUrl: "https://api.anthropic.com/v1",
        model,
        supportsJsonMode: false,
      };
    case "google":
      return {
        provider,
        apiKey: input.apiKey,
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        model,
        supportsJsonMode: true,
      };
    case "openai":
    default:
      return {
        provider: "openai",
        apiKey: input.apiKey,
        baseUrl: "https://api.openai.com/v1",
        model,
        supportsJsonMode: true,
      };
  }
}

/**
 * Dev / server fallback when the client does not send a user key.
 * Production flows should always use the user's single key from Firestore.
 */
export function getLlmConfig(): LlmConfig | null {
  const providers: { key?: string; provider: LlmProvider }[] = [
    { key: process.env.OPENAI_API_KEY?.trim(), provider: "openai" },
    { key: process.env.ANTHROPIC_API_KEY?.trim(), provider: "anthropic" },
    { key: process.env.PERPLEXITY_API_KEY?.trim(), provider: "perplexity" },
    { key: process.env.GOOGLE_API_KEY?.trim(), provider: "google" },
  ];
  for (const { key, provider } of providers) {
    if (key) return configFromUserLlm({ provider, apiKey: key });
  }
  return null;
}
