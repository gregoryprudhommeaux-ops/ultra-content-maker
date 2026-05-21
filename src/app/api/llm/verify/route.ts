import { configFromUserLlm } from "@/lib/llm/config";
import { chatCompletionJson } from "@/lib/llm/chat";
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
    return NextResponse.json({ error: "verify_failed", detail }, { status: 502 });
  }
}
