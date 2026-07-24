import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { chatCompletionJson, mergeUsageLog } from "@/lib/llm/chat";
import { resolveContentRouteLlm } from "@/lib/llm/resolve-content-route-llm";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildVoiceFingerprintAnalyzeSystemPrompt,
  buildVoiceFingerprintAnalyzeUserPrompt,
  normalizeVoiceFingerprintAnalyze,
} from "@/lib/prompts/voice-fingerprint-analyze";
import type { ContentLanguage, LlmProvider } from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  posts: string[];
  sourceLabels?: string[];
  contentLanguage?: string;
  llm?: {
    provider: LlmProvider;
    apiKey: string;
    model?: string;
  };
};

export async function POST(request: Request) {
  const userId = await verifyBearerUserId(request.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
    const posts = Array.isArray(body.posts)
      ? body.posts.map((p) => String(p ?? "").trim()).filter((p) => p.length >= 40)
      : [];
    if (posts.length < 2 || posts.length > 3) throw new Error("invalid");
    body.posts = posts.slice(0, 3);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const contentLanguage = (body.contentLanguage || "fr") as ContentLanguage;
  const llm = await resolveContentRouteLlm(userId, body.llm);
  if (!llm) {
    return NextResponse.json({ error: "no_llm_key" }, { status: 503 });
  }

  try {
    const raw = await chatCompletionJson(
      llm,
      [
        {
          role: "system",
          content: buildVoiceFingerprintAnalyzeSystemPrompt(contentLanguage),
        },
        {
          role: "user",
          content: buildVoiceFingerprintAnalyzeUserPrompt(body.posts),
        },
      ],
      mergeUsageLog(userId, "persona/voice-fingerprint"),
    );

    const parsed = parseLlmJson<Record<string, unknown>>(raw);
    const fingerprint = normalizeVoiceFingerprintAnalyze(
      parsed,
      body.sourceLabels,
    );
    if (!fingerprint) {
      return NextResponse.json(
        { error: "llm_request_failed", detail: "Invalid voice fingerprint" },
        { status: 502 },
      );
    }

    return NextResponse.json({ fingerprint, model: llm.model });
  } catch (e) {
    return NextResponse.json(
      {
        error: "llm_request_failed",
        detail: e instanceof Error ? e.message : "Unknown",
      },
      { status: 502 },
    );
  }
}
