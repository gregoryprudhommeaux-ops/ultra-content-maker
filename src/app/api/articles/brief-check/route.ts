import { heuristicBriefNicheCheck } from "@/lib/articles/brief-niche-check";
import { configFromUserLlm, getLlmConfig } from "@/lib/llm/config";
import { chatCompletionJson } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildBriefCheckSystemPrompt,
  buildBriefCheckUserPrompt,
} from "@/lib/prompts/article-brief-check";
import type { BriefNicheCheck, ContentLanguage, LlmProvider, PostBrief } from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  postBrief: PostBrief;
  contentLanguage?: string;
  personaPromptText?: string;
  useLlm?: boolean;
  llm?: {
    provider: LlmProvider;
    apiKey: string;
    model?: string;
  };
};

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? Math.round(n) : Number(n);
  if (!Number.isFinite(v)) return 5;
  return Math.min(10, Math.max(1, v));
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
    if (!body.postBrief?.objective) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const heuristic = heuristicBriefNicheCheck(body.postBrief);

  if (!body.useLlm) {
    return NextResponse.json({ ...heuristic, source: "heuristic" });
  }

  const contentLanguage = (body.contentLanguage || "en") as ContentLanguage;
  const llm =
    body.llm?.apiKey?.trim()
      ? configFromUserLlm({
          provider: body.llm.provider,
          apiKey: body.llm.apiKey.trim(),
          model: body.llm.model,
        })
      : getLlmConfig();

  if (!llm) {
    return NextResponse.json({ ...heuristic, source: "heuristic" });
  }

  try {
    const raw = await chatCompletionJson(llm, [
      {
        role: "system",
        content: buildBriefCheckSystemPrompt(contentLanguage),
      },
      {
        role: "user",
        content: buildBriefCheckUserPrompt(
          body.postBrief,
          body.personaPromptText ?? "",
        ),
      },
    ]);

    const parsed = parseLlmJson<{
      score?: unknown;
      isTooGeneric?: boolean;
      feedback?: string;
      suggestions?: unknown;
    }>(raw);

    const result: BriefNicheCheck = {
      score: clampScore(parsed.score ?? heuristic.score),
      isTooGeneric: !!parsed.isTooGeneric,
      feedback:
        typeof parsed.feedback === "string" && parsed.feedback.trim()
          ? parsed.feedback.trim()
          : heuristic.feedback,
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions
            .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
            .map((s) => s.trim())
            .slice(0, 3)
        : heuristic.suggestions,
    };

    return NextResponse.json({ ...result, source: "llm" });
  } catch {
    return NextResponse.json({ ...heuristic, source: "heuristic_fallback" });
  }
}
