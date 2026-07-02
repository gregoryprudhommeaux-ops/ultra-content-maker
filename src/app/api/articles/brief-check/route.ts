import { heuristicBriefNicheCheck } from "@/lib/articles/brief-niche-check";
import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { chatCompletionJson, mergeUsageLog } from "@/lib/llm/chat";
import { resolveRequestLlm } from "@/lib/llm/resolve-request-llm";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildBriefCheckSystemPrompt,
  buildBriefCheckUserPrompt,
} from "@/lib/prompts/article-brief-check";
import { resolveAuthorSteering, type AuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import {
  hasPostObjectivesFromUnknown,
  normalizePostBrief,
} from "@/lib/articles/post-brief-objectives";
import type { BriefNicheCheck, ContentLanguage, LlmProvider, PostBrief } from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  postBrief: PostBrief;
  contentLanguage?: string;
  personaPromptText?: string;
  authorSteering?: AuthorSteeringPayload;
  profileEnrichment?: Record<string, unknown>;
  author?: Record<string, unknown>;
  audience?: Record<string, unknown>;
  useLlm?: boolean;
  llm?: {
    provider: LlmProvider;
    apiKey?: string;
    model?: string;
  };
};

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? Math.round(n) : Number(n);
  if (!Number.isFinite(v)) return 5;
  return Math.min(10, Math.max(1, v));
}

export async function POST(request: Request) {
  const userId = await verifyBearerUserId(request.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
    if (!hasPostObjectivesFromUnknown(body.postBrief)) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const postBrief = normalizePostBrief(body.postBrief);
  const heuristic = heuristicBriefNicheCheck(postBrief);

  if (!body.useLlm) {
    return NextResponse.json({ ...heuristic, source: "heuristic" });
  }

  const contentLanguage = (body.contentLanguage || "en") as ContentLanguage;
  const llm = await resolveRequestLlm(userId, body.llm);

  if (!llm) {
    return NextResponse.json({ ...heuristic, source: "heuristic" });
  }

  const authorSteering = resolveAuthorSteering({
    authorSteering: body.authorSteering,
    author: body.author,
    audience: body.audience,
    profileEnrichment: body.profileEnrichment,
  });

  try {
    const raw = await chatCompletionJson(llm, [
      {
        role: "system",
        content: buildBriefCheckSystemPrompt(contentLanguage),
      },
      {
        role: "user",
        content: buildBriefCheckUserPrompt(
          postBrief,
          body.personaPromptText ?? "",
          authorSteering,
        ),
      },
    ], mergeUsageLog(userId, "articles/brief-check"));

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
