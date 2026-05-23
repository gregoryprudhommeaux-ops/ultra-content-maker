import { isInvalidApiKeyError } from "@/lib/llm/parse-json";

export type LlmErrorKind =
  | "no_key"
  | "invalid_key"
  | "empty_response"
  | "invalid_json"
  | "rate_limit"
  | "timeout"
  | "generic";

export function classifyLlmApiError(
  errorCode?: string,
  detail?: string,
): { kind: LlmErrorKind; detail: string } {
  const d = (detail ?? "").trim();
  const lower = d.toLowerCase();
  const code = (errorCode ?? "").toLowerCase();

  if (code === "no_llm_key") return { kind: "no_key", detail: d };
  if (isInvalidApiKeyError(d)) return { kind: "invalid_key", detail: d };
  if (code === "empty revision" || code === "empty_response")
    return { kind: "empty_response", detail: d };
  if (
    code === "invalid_json" ||
    lower.includes("json") ||
    lower.includes("unexpected token")
  ) {
    return { kind: "invalid_json", detail: d };
  }
  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("quota")) {
    return { kind: "rate_limit", detail: d };
  }
  if (lower.includes("timeout") || lower.includes("aborted") || lower.includes("timed out")) {
    return { kind: "timeout", detail: d };
  }
  return { kind: "generic", detail: d };
}

/** Short technical line for power users (max length). */
export function truncateApiDetail(detail: string, max = 220): string {
  const oneLine = detail.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max)}…`;
}
