import { configFromUserLlm } from "@/lib/llm/config";
import { chatCompletionJson } from "@/lib/llm/chat";
import { classifyProviderErrorMessage } from "@/lib/llm/provider-errors";
import type { LlmProvider } from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VerifyBody = {
  provider: LlmProvider;
  apiKey: string;
  model?: string;
};

export async function POST(request: Request) {
  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
    if (!body.provider || !body.apiKey?.trim()) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const llm = configFromUserLlm({
    provider: body.provider,
    apiKey: body.apiKey.trim(),
    model: body.model,
  });

  try {
    await chatCompletionJson(llm, [
      {
        role: "user",
        content: 'Reply with JSON only: {"ok":true}',
      },
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown error";
    const kind = classifyProviderErrorMessage(detail);
    if (kind === "insufficient_credits") {
      return NextResponse.json({ error: "insufficient_credits", detail }, { status: 402 });
    }
    if (kind === "invalid_key") {
      return NextResponse.json({ error: "invalid_api_key", detail }, { status: 401 });
    }
    if (kind === "rate_limit") {
      return NextResponse.json({ error: "rate_limit", detail }, { status: 429 });
    }
    return NextResponse.json({ error: "verify_failed", detail }, { status: 502 });
  }
}
