export type ProviderErrorKind =
  | "invalid_key"
  | "insufficient_credits"
  | "rate_limit"
  | "generic";

/** Human-readable line from provider JSON error blobs (anthropic: {...}). */
export function extractProviderErrorMessage(raw: string): string {
  const trimmed = raw.trim();
  const jsonStart = trimmed.indexOf("{");
  if (jsonStart < 0) return trimmed.replace(/^[a-z]+:\s*/i, "").slice(0, 280);

  try {
    const parsed = JSON.parse(trimmed.slice(jsonStart)) as {
      error?: { message?: string; type?: string };
      message?: string;
    };
    const nested = parsed.error?.message ?? parsed.message;
    if (typeof nested === "string" && nested.trim()) return nested.trim();
  } catch {
    /* fall through */
  }

  const messageMatch = trimmed.match(/"message"\s*:\s*"([^"]+)"/);
  if (messageMatch?.[1]) return messageMatch[1].replace(/\\"/g, '"').slice(0, 280);

  return trimmed.replace(/^[a-z]+:\s*/i, "").slice(0, 280);
}

export function classifyProviderErrorMessage(message: string): ProviderErrorKind {
  const m = message.toLowerCase();
  const readable = extractProviderErrorMessage(message).toLowerCase();

  const creditHints = [
    "credit",
    "solde",
    "balance",
    "billing",
    "payment",
    "insufficient",
    "purchase",
    "quota",
    "exceeded your current",
  ];
  if (
    creditHints.some((h) => m.includes(h) || readable.includes(h)) &&
    !m.includes("rate limit")
  ) {
    return "insufficient_credits";
  }

  if (
    m.includes("invalid_api_key") ||
    m.includes("invalid x-api-key") ||
    m.includes("incorrect api key") ||
    m.includes("invalid api key") ||
    m.includes("api key not valid") ||
    readable.includes("invalid api key") ||
    (m.includes("authentication_error") && !m.includes("invalid_request")) ||
    (m.includes("401") &&
      !creditHints.some((h) => m.includes(h) || readable.includes(h)))
  ) {
    return "invalid_key";
  }

  if (m.includes("429") || m.includes("rate limit") || m.includes("too many requests")) {
    return "rate_limit";
  }

  return "generic";
}

export function isInsufficientCreditsError(message: string): boolean {
  return classifyProviderErrorMessage(message) === "insufficient_credits";
}

export function isInvalidApiKeyError(message: string): boolean {
  return classifyProviderErrorMessage(message) === "invalid_key";
}

/** Provider prefix from `anthropic: {...}` style errors. */
export function providerFromErrorMessage(message: string): string | null {
  const match = message.match(/^([a-z]+):/i);
  return match?.[1]?.toLowerCase() ?? null;
}
