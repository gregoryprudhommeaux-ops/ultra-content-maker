import { configFromUserLlm, getLlmConfig } from "@/lib/llm/config";
import { chatCompletionJson } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildBriefSuggestSystemPrompt,
  buildBriefSuggestUserPrompt,
  normalizeSuggestedBrief,
} from "@/lib/prompts/brief-suggest";
import { resolveAuthorSteering, type AuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import type {
  ArticleNewsSource,
  ContentLanguage,
  LlmProvider,
} from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  mode: "news" | "inspiration";
  contentLanguage: string;
  personaPromptText: string;
  newsSource?: ArticleNewsSource;
  inspirationText?: string;
  inspirationMeta?: Record<string, unknown>;
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
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
    if (!body.personaPromptText?.trim() || !body.mode) throw new Error("invalid");
    if (body.mode === "news" && !body.newsSource?.title) throw new Error("invalid");
    if (body.mode === "inspiration" && !body.inspirationText?.trim()) {
      throw new Error("invalid");
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const contentLanguage = (body.contentLanguage || "fr") as ContentLanguage;
  const llm =
    body.llm?.apiKey?.trim()
      ? configFromUserLlm({
          provider: body.llm.provider,
          apiKey: body.llm.apiKey.trim(),
          model: body.llm.model,
        })
      : getLlmConfig();

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
    const raw = await chatCompletionJson(llm, [
      {
        role: "system",
        content: buildBriefSuggestSystemPrompt(contentLanguage),
      },
      {
        role: "user",
        content: buildBriefSuggestUserPrompt({
          mode: body.mode,
          contentLanguage,
          personaExcerpt: body.personaPromptText,
          newsSource: body.newsSource,
          inspirationText: body.inspirationText,
          inspirationMeta: body.inspirationMeta,
          authorSteering,
        }),
      },
    ]);

    const parsed = parseLlmJson<{
      objective?: unknown;
      problem?: unknown;
      pointOfView?: unknown;
      proof?: unknown;
    }>(raw);

    const brief = normalizeSuggestedBrief(parsed);
    return NextResponse.json({ brief, model: llm.model });
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
