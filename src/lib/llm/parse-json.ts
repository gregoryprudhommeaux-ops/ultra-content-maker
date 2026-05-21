/** Extract JSON from raw LLM output (handles markdown fences). */
export function parseLlmJson<T>(raw: string): T {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    text = text.slice(start, end + 1);
  }
  return JSON.parse(text) as T;
}

export function isInvalidApiKeyError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("invalid api key") ||
    m.includes("incorrect api key") ||
    m.includes("invalid_api_key") ||
    m.includes("authentication") ||
    m.includes("unauthorized") ||
    m.includes("401")
  );
}
