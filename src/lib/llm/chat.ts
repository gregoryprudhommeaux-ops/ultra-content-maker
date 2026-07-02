import type { LlmConfig } from "./config";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { recordLlmUsage } from "@/lib/admin/llm-usage.server";
import { isPlatformApiKey } from "@/lib/llm/platform-key.server";

type ChatMessage = { role: "system" | "user"; content: string };

type LlmCallResult = { text: string; usage: { prompt: number; completion: number } };

export type ChatCompletionOptions = {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  usageLog?: {
    userId: string;
    route: string;
  };
};

const DEFAULT_CHAT_OPTIONS = {
  maxTokens: 8192,
  temperature: 0.4,
  timeoutMs: 120_000,
} as const;

function resolveChatOptions(options?: ChatCompletionOptions) {
  return {
    maxTokens: options?.maxTokens ?? DEFAULT_CHAT_OPTIONS.maxTokens,
    temperature: options?.temperature ?? DEFAULT_CHAT_OPTIONS.temperature,
    timeoutMs: options?.timeoutMs ?? DEFAULT_CHAT_OPTIONS.timeoutMs,
  };
}

async function openAiCompatibleJson(
  config: LlmConfig,
  messages: ChatMessage[],
  options?: ChatCompletionOptions,
): Promise<LlmCallResult> {
  const { maxTokens, temperature, timeoutMs } = resolveChatOptions(options);
  const buildBody = (withJsonMode: boolean): Record<string, unknown> => {
    const body: Record<string, unknown> = {
      model: config.model,
      temperature,
      max_tokens: maxTokens,
      messages,
    };
    // Perplexity often ignores or mishandles response_format; rely on prompt + parseLlmJson.
    if (withJsonMode && config.supportsJsonMode && config.provider !== "perplexity") {
      body.response_format = { type: "json_object" };
    }
    return body;
  };

  const request = async (withJsonMode: boolean) => {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildBody(withJsonMode)),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res;
  };

  let res = await request(true);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 500);
    const lower = errText.toLowerCase();
    const jsonModeRejected =
      config.supportsJsonMode &&
      config.provider !== "perplexity" &&
      (lower.includes("response_format") ||
        lower.includes("json_object") ||
        lower.includes("json mode"));
    if (jsonModeRejected) {
      res = await request(false);
      if (!res.ok) {
        throw new Error(`${config.provider}: ${(await res.text()).slice(0, 500)}`);
      }
    } else {
      throw new Error(`${config.provider}: ${errText}`);
    }
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty model response");
  return {
    text: content,
    usage: {
      prompt: data.usage?.prompt_tokens ?? 0,
      completion: data.usage?.completion_tokens ?? 0,
    },
  };
}

async function anthropicJson(
  config: LlmConfig,
  messages: ChatMessage[],
  options?: ChatCompletionOptions,
): Promise<LlmCallResult> {
  const { maxTokens, timeoutMs } = resolveChatOptions(options);
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const user = messages.find((m) => m.role === "user")?.content ?? "";

  const res = await fetch(`${config.baseUrl}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`anthropic: ${(await res.text()).slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("Empty Anthropic response");
  return {
    text,
    usage: {
      prompt: data.usage?.input_tokens ?? 0,
      completion: data.usage?.output_tokens ?? 0,
    },
  };
}

async function geminiJson(
  config: LlmConfig,
  messages: ChatMessage[],
  options?: ChatCompletionOptions,
): Promise<LlmCallResult> {
  const { maxTokens, temperature, timeoutMs } = resolveChatOptions(options);
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const user = messages.find((m) => m.role === "user")?.content ?? "";
  const prompt = `${system}\n\n${user}\n\nRespond with valid JSON only.`;

  const url = `${config.baseUrl}/models/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: maxTokens,
        temperature,
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`google: ${(await res.text()).slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty Gemini response");
  return {
    text,
    usage: {
      prompt: data.usageMetadata?.promptTokenCount ?? 0,
      completion: data.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

function messagesToPromptText(messages: ChatMessage[]): string {
  return messages.map((m) => m.content).join("\n");
}

async function persistUsageLog(
  config: LlmConfig,
  options: ChatCompletionOptions | undefined,
  messages: ChatMessage[],
  result: LlmCallResult,
): Promise<void> {
  const ctx = options?.usageLog;
  if (!ctx) return;
  const usedPlatformKey = isPlatformApiKey(config.apiKey);
  if (!usedPlatformKey) return;

  const db = getAdminFirestore();
  if (!db) return;

  const promptTokens =
    result.usage.prompt > 0
      ? result.usage.prompt
      : Math.ceil(messagesToPromptText(messages).length / 4);
  const completionTokens =
    result.usage.completion > 0
      ? result.usage.completion
      : Math.ceil(result.text.length / 4);

  await recordLlmUsage(db, {
    userId: ctx.userId,
    route: ctx.route,
    provider: config.provider,
    model: config.model,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    usedPlatformKey: true,
  }).catch(() => {
    /* non-blocking */
  });
}

export function mergeUsageLog(
  userId: string,
  route: string,
  options?: ChatCompletionOptions,
): ChatCompletionOptions {
  return { ...options, usageLog: { userId, route } };
}

/** Tighter defaults for single-post revision (smaller prompts, faster completion). */
export const REVISE_CHAT_OPTIONS: ChatCompletionOptions = {
  maxTokens: 2048,
  temperature: 0.35,
  timeoutMs: 90_000,
};

/** Creator radar: small JSON payload, same providers as news suggestions. */
export const CREATOR_RADAR_CHAT_OPTIONS: ChatCompletionOptions = {
  maxTokens: 2048,
  temperature: 0.35,
  timeoutMs: 90_000,
};

export async function chatCompletionJson(
  config: LlmConfig,
  messages: ChatMessage[],
  options?: ChatCompletionOptions,
): Promise<string> {
  let result: LlmCallResult;
  switch (config.provider) {
    case "anthropic":
      result = await anthropicJson(config, messages, options);
      break;
    case "google":
      result = await geminiJson(config, messages, options);
      break;
    case "openai":
    case "perplexity":
    default:
      result = await openAiCompatibleJson(config, messages, options);
  }
  await persistUsageLog(config, options, messages, result);
  return result.text;
}
