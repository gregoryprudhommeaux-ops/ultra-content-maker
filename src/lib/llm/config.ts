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

const PLATFORM_ENV_KEYS: { env: string; provider: LlmProvider }[] = [
  { env: "OPENAI_API_KEY", provider: "openai" },
  { env: "ANTHROPIC_API_KEY", provider: "anthropic" },
  { env: "PERPLEXITY_API_KEY", provider: "perplexity" },
  { env: "GOOGLE_API_KEY", provider: "google" },
];

function readPlatformEnvConfigs(): LlmConfig[] {
  const out: LlmConfig[] = [];
  for (const { env, provider } of PLATFORM_ENV_KEYS) {
    const key = process.env[env]?.trim();
    if (key && key.length >= 8) {
      out.push(configFromUserLlm({ provider, apiKey: key }));
    }
  }
  return out;
}

/** Platform env keys (OpenAI → Anthropic → Perplexity → Google). Honors PLATFORM_LLM_PROVIDER when set. */
export function getPlatformLlmConfig(): LlmConfig | null {
  const all = readPlatformEnvConfigs();
  const preferred = process.env.PLATFORM_LLM_PROVIDER?.trim() as LlmProvider | undefined;
  if (preferred) {
    const match = all.find((c) => c.provider === preferred);
    if (match) return match;
  }
  return all[0] ?? null;
}

/** @deprecated use getPlatformLlmConfig */
export function getLlmConfig(): LlmConfig | null {
  return getPlatformLlmConfig();
}
