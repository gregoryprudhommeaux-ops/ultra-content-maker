import type { LlmConfig } from "./config";

type ChatMessage = { role: "system" | "user"; content: string };

export type ChatCompletionOptions = {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
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
): Promise<string> {
  const { maxTokens, temperature, timeoutMs } = resolveChatOptions(options);
  const body: Record<string, unknown> = {
    model: config.model,
    temperature,
    max_tokens: maxTokens,
    messages,
  };
  // Perplexity often ignores or mishandles response_format; rely on prompt + parseLlmJson.
  if (config.supportsJsonMode && config.provider !== "perplexity") {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`${config.provider}: ${(await res.text()).slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty model response");
  return content;
}

async function anthropicJson(
  config: LlmConfig,
  messages: ChatMessage[],
  options?: ChatCompletionOptions,
): Promise<string> {
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
  };
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("Empty Anthropic response");
  return text;
}

async function geminiJson(
  config: LlmConfig,
  messages: ChatMessage[],
  options?: ChatCompletionOptions,
): Promise<string> {
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
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty Gemini response");
  return text;
}

/** Tighter defaults for single-post revision (smaller prompts, faster completion). */
export const REVISE_CHAT_OPTIONS: ChatCompletionOptions = {
  maxTokens: 2048,
  temperature: 0.35,
  timeoutMs: 90_000,
};

export async function chatCompletionJson(
  config: LlmConfig,
  messages: ChatMessage[],
  options?: ChatCompletionOptions,
): Promise<string> {
  switch (config.provider) {
    case "anthropic":
      return anthropicJson(config, messages, options);
    case "google":
      return geminiJson(config, messages, options);
    case "openai":
    case "perplexity":
    default:
      return openAiCompatibleJson(config, messages, options);
  }
}
