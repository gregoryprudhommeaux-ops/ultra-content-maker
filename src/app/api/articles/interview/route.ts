import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { chatCompletionJson, mergeUsageLog } from "@/lib/llm/chat";
import { resolveContentRouteLlm } from "@/lib/llm/resolve-content-route-llm";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildInterviewExtractSystemPrompt,
  buildInterviewExtractUserPrompt,
  buildInterviewQuestionsSystemPrompt,
  buildInterviewQuestionsUserPrompt,
  normalizeInterviewExtract,
  normalizeInterviewQuestions,
  type InterviewAnswer,
} from "@/lib/prompts/interview-extract";
import {
  resolveAuthorSteering,
  type AuthorSteeringPayload,
} from "@/lib/profile/author-steering-context";
import type { ContentLanguage, LlmProvider } from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  phase: "questions" | "extract";
  contentLanguage: string;
  personaPromptText: string;
  answers?: InterviewAnswer[];
  contentNiche?: string;
  authorSteering?: AuthorSteeringPayload;
  author?: Record<string, unknown>;
  audience?: Record<string, unknown>;
  profileEnrichment?: Record<string, unknown>;
  newsInterestQuery?: string;
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
    if (!body.personaPromptText?.trim() || !body.phase) throw new Error("invalid");
    if (body.phase !== "questions" && body.phase !== "extract") throw new Error("invalid");
    if (body.phase === "extract") {
      const answers = Array.isArray(body.answers) ? body.answers : [];
      const filled = answers.filter((a) => a?.answer?.trim());
      if (filled.length < 2) throw new Error("invalid");
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const contentLanguage = (body.contentLanguage || "fr") as ContentLanguage;
  const llm = await resolveContentRouteLlm(userId, body.llm);

  if (!llm) {
    return NextResponse.json({ error: "no_llm_key" }, { status: 503 });
  }

  const authorSteering = resolveAuthorSteering({
    authorSteering: body.authorSteering,
    author: body.author,
    audience: body.audience,
    profileEnrichment: body.profileEnrichment,
    newsInterestQuery: body.newsInterestQuery,
  });

  try {
    if (body.phase === "questions") {
      const raw = await chatCompletionJson(
        llm,
        [
          {
            role: "system",
            content: buildInterviewQuestionsSystemPrompt(contentLanguage),
          },
          {
            role: "user",
            content: buildInterviewQuestionsUserPrompt({
              contentLanguage,
              personaExcerpt: body.personaPromptText,
              authorSteering,
              contentNiche: body.contentNiche,
            }),
          },
        ],
        mergeUsageLog(userId, "articles/interview-questions"),
      );

      const parsed = parseLlmJson<{ questions?: unknown }>(raw);
      const questions = normalizeInterviewQuestions(parsed);
      if (questions.length < 4) {
        return NextResponse.json(
          { error: "llm_request_failed", detail: "Too few interview questions" },
          { status: 502 },
        );
      }
      return NextResponse.json({ questions, model: llm.model });
    }

    const answers = (body.answers ?? []).filter((a) => a?.answer?.trim());
    const raw = await chatCompletionJson(
      llm,
      [
        {
          role: "system",
          content: buildInterviewExtractSystemPrompt(contentLanguage),
        },
        {
          role: "user",
          content: buildInterviewExtractUserPrompt({
            contentLanguage,
            personaExcerpt: body.personaPromptText,
            answers,
            authorSteering,
            contentNiche: body.contentNiche,
          }),
        },
      ],
      mergeUsageLog(userId, "articles/interview-extract"),
    );

    const parsed = parseLlmJson<{
      objectives?: unknown;
      objective?: unknown;
      problem?: unknown;
      pointOfView?: unknown;
      proof?: unknown;
      matterSummary?: unknown;
      storytellingTips?: unknown;
      nextAngles?: unknown;
    }>(raw);

    const result = normalizeInterviewExtract(parsed);
    return NextResponse.json({
      brief: result.brief,
      sessionPack: result.sessionPack,
      matterSummary: result.matterSummary,
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
