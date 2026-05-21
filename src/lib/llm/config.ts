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

/** Dev fallback: server .env.local keys */
export function getLlmConfig(): LlmConfig | null {
  const perplexityKey = process.env.PERPLEXITY_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (perplexityKey) {
    return configFromUserLlm({ provider: "perplexity", apiKey: perplexityKey });
  }
  if (openaiKey) {
    return configFromUserLlm({ provider: "openai", apiKey: openaiKey });
  }
  return null;
}
