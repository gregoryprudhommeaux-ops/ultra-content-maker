import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { chatCompletionJson, mergeUsageLog } from "@/lib/llm/chat";
import { resolveRequestLlm } from "@/lib/llm/resolve-request-llm";
import { requireActiveSubscriptionLlm } from "@/lib/subscription/llm-gate.server";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildPersonaInsightsSystemPrompt,
  buildPersonaInsightsUserPrompt,
} from "@/lib/prompts/persona-insights";
import type { ContentLanguage, LlmProvider } from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostPayload = {
  hook: string;
  objective?: string;
  signals?: {
    saves?: number;
    qualifiedComments?: number;
    profileVisits?: number;
    dms?: number;
    businessOpportunity?: string;
  };
  qualityScores?: {
    nicheClarity?: number;
    conversationPotential?: number;
  };
  slopScore?: number;
  validatedAt?: string;
};

type Body = {
  contentLanguage: string;
  personaPromptText: string;
  posts: PostPayload[];
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

  const subGate = await requireActiveSubscriptionLlm(userId, { premium: true });
  if (!subGate.ok) {
    return NextResponse.json(
      { error: subGate.code, subscription: subGate.access },
      { status: subGate.status },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
    if (!body.personaPromptText?.trim() || !Array.isArray(body.posts)) {
      throw new Error("invalid");
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.posts.length === 0) {
    return NextResponse.json(
      { error: "no_validated_posts", message: "Add performance data on at least one validated post." },
      { status: 400 },
    );
  }

  const contentLanguage = (body.contentLanguage || "en") as ContentLanguage;
  const llm = await resolveRequestLlm(userId, body.llm);

  if (!llm) {
    return NextResponse.json({ error: "no_llm_key" }, { status: 503 });
  }

  try {
    const raw = await chatCompletionJson(llm, [
      { role: "system", content: buildPersonaInsightsSystemPrompt(contentLanguage) },
      {
        role: "user",
        content: buildPersonaInsightsUserPrompt({
          personaExcerpt: body.personaPromptText,
          posts: body.posts,
        }),
      },
    ], mergeUsageLog(userId, "persona/insights"));

    const parsed = parseLlmJson<{
      summary?: string;
      suggestions?: unknown;
    }>(raw);

    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions
          .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
          .map((s) => s.trim())
          .slice(0, 8)
      : [];

    if (!summary) {
      return NextResponse.json({ error: "Empty insights" }, { status: 502 });
    }

    return NextResponse.json({
      summary,
      suggestions,
      postsAnalyzed: body.posts.length,
      model: llm.model,
    });
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
