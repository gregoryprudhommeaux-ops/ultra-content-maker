import { configFromUserLlm, getLlmConfig } from "@/lib/llm/config";
import { chatCompletionJson } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildPersonaRefreshSystemPrompt,
  buildPersonaRefreshUserPrompt,
} from "@/lib/prompts/persona-refresh";
import type {
  AudienceProfile,
  AuthorProfile,
  ContentLanguage,
  GapAnswerValue,
  LlmProvider,
  SourceLink,
} from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RefreshBody = {
  currentBasePrompt: string;
  author: Record<string, unknown> | null;
  audience: Record<string, unknown> | null;
  sources: { type: string; url: string; label?: string }[];
  contentLanguage: string;
  profileEnrichment?: Record<string, GapAnswerValue>;
  userComment?: string;
  llm?: {
    provider: LlmProvider;
    apiKey: string;
    model?: string;
  };
};

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RefreshBody;
  try {
    body = (await request.json()) as RefreshBody;
    if (!body.currentBasePrompt?.trim() || !body.contentLanguage) {
      throw new Error("invalid");
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const userLlm = body.llm?.apiKey?.trim()
    ? configFromUserLlm({
        provider: body.llm.provider,
        apiKey: body.llm.apiKey.trim(),
        model: body.llm.model,
      })
    : null;
  const llm = userLlm ?? getLlmConfig();
  if (!llm) {
    return NextResponse.json({ error: "no_llm_key" }, { status: 503 });
  }

  const contentLanguage = body.contentLanguage as ContentLanguage;
  const enrichment = body.profileEnrichment
    ? { details: body.profileEnrichment, updatedAt: new Date() }
    : null;

  const systemPrompt = buildPersonaRefreshSystemPrompt(contentLanguage);
  const userContent = buildPersonaRefreshUserPrompt(
    body.currentBasePrompt,
    body.author as AuthorProfile | null,
    body.audience as AudienceProfile | null,
    body.sources as SourceLink[],
    enrichment,
    contentLanguage,
    body.userComment,
  );

  let raw: string;
  try {
    raw = await chatCompletionJson(llm, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ]);
  } catch (e) {
    return NextResponse.json(
      {
        error: "llm_request_failed",
        detail: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 502 },
    );
  }

  let parsed: { promptText?: string; changeSummary?: string };
  try {
    parsed = parseLlmJson<{ promptText?: string; changeSummary?: string }>(raw);
  } catch {
    return NextResponse.json(
      { error: "invalid_model_json", detail: raw.slice(0, 200) },
      { status: 502 },
    );
  }

  if (!parsed.promptText || parsed.promptText.length < 200) {
    return NextResponse.json({ error: "Prompt too short" }, { status: 502 });
  }

  return NextResponse.json({
    promptText: parsed.promptText,
    changeSummary: parsed.changeSummary?.trim() ?? "",
    model: llm.model,
    provider: llm.provider,
  });
}
