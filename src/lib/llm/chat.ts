import type { LlmConfig } from "./config";

type ChatMessage = { role: "system" | "user"; content: string };

async function openAiCompatibleJson(
  config: LlmConfig,
  messages: ChatMessage[],
): Promise<string> {
  const body: Record<string, unknown> = {
    model: config.model,
    temperature: 0.4,
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
    signal: AbortSignal.timeout(120_000),
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
): Promise<string> {
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
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(120_000),
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
): Promise<string> {
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const user = messages.find((m) => m.role === "user")?.content ?? "";
  const prompt = `${system}\n\n${user}\n\nRespond with valid JSON only.`;

  const url = `${config.baseUrl}/models/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(120_000),
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

export async function chatCompletionJson(
  config: LlmConfig,
  messages: ChatMessage[],
): Promise<string> {
  switch (config.provider) {
    case "anthropic":
      return anthropicJson(config, messages);
    case "google":
      return geminiJson(config, messages);
    case "openai":
    case "perplexity":
    default:
      return openAiCompatibleJson(config, messages);
  }
}
