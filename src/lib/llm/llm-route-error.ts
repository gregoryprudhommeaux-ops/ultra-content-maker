import { NextResponse } from "next/server";
import {
  classifyProviderErrorMessage,
  providerFromErrorMessage,
} from "@/lib/llm/provider-errors";

/** Maps a thrown LLM provider error to a structured API response. */
export function llmErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown";
  const providerKind = classifyProviderErrorMessage(message);
  const provider = providerFromErrorMessage(message);

  if (providerKind === "insufficient_credits") {
    return NextResponse.json(
      { error: "insufficient_credits", detail: message, provider },
      { status: 402 },
    );
  }

  if (providerKind === "invalid_key") {
    return NextResponse.json(
      { error: "invalid_api_key", detail: message, provider },
      { status: 401 },
    );
  }

  if (providerKind === "rate_limit") {
    return NextResponse.json(
      { error: "rate_limit", detail: message, provider },
      { status: 429 },
    );
  }

  return NextResponse.json(
    { error: "llm_request_failed", detail: message, provider },
    { status: 502 },
  );
}
