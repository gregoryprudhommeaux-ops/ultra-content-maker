import { buildExportText } from "@/lib/workspace/articles";
import { configFromUserLlm, getLlmConfig } from "@/lib/llm/config";
import { chatCompletionJson } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildArticleTranslateSystemPrompt,
  buildArticleTranslateUserPrompt,
  normalizeArticleTranslationOutput,
} from "@/lib/prompts/article-translate";
import {
  fitLinkedInArticleParts,
  maxDraftCharsForArticle,
} from "@/lib/linkedin/fit-linkedin-post";
import { resolveAuthorSteering, type AuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import { isTranslationLocaleDisabled } from "@/lib/articles/translation-locale";
import type {
  ArticleTranslationLocale,
  ArticleTranslationMode,
  ContentLanguage,
  LlmProvider,
  PostBrief,
} from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  sourceLanguage: ContentLanguage;
  targetLocale: ArticleTranslationLocale;
  mode: ArticleTranslationMode;
  personaPromptText: string;
  hook: string;
  body: string;
  ps?: string;
  hashtags?: string[];
  postBrief?: PostBrief;
  authorSteering?: AuthorSteeringPayload;
  profileEnrichment?: Record<string, unknown>;
  author?: Record<string, unknown>;
  audience?: Record<string, unknown>;
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
    if (
      !body.personaPromptText?.trim() ||
      !body.hook?.trim() ||
      !body.body?.trim() ||
      !body.targetLocale ||
      !body.mode
    ) {
      throw new Error("invalid");
    }
    if (isTranslationLocaleDisabled(body.sourceLanguage, body.targetLocale)) {
      throw new Error("same_language");
    }
  } catch (e) {
    if (e instanceof Error && e.message === "same_language") {
      return NextResponse.json({ error: "same_language" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

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
  });

  try {
    const raw = await chatCompletionJson(llm, [
      {
        role: "system",
        content: buildArticleTranslateSystemPrompt(body.targetLocale, body.mode),
      },
      {
        role: "user",
        content: buildArticleTranslateUserPrompt({
          sourceLanguage: body.sourceLanguage,
          targetLocale: body.targetLocale,
          mode: body.mode,
          personaExcerpt: body.personaPromptText,
          hook: body.hook,
          body: body.body,
          ps: body.ps,
          hashtags: body.hashtags,
          postBrief: body.postBrief,
          authorSteering,
        }),
      },
    ]);

    const parsed = parseLlmJson<{
      hook?: unknown;
      body?: unknown;
      ps?: unknown;
      hashtags?: unknown;
    }>(raw);

    const normalized = normalizeArticleTranslationOutput(parsed);
    if (!normalized) {
      return NextResponse.json({ error: "Invalid translation output" }, { status: 502 });
    }

    const fitted = fitLinkedInArticleParts(
      {
        hook: normalized.hook,
        body: normalized.body,
        ps: normalized.ps,
      },
      maxDraftCharsForArticle(normalized.hashtags),
    );

    const exportText = buildExportText(
      fitted.hook,
      fitted.body,
      fitted.ps,
      "",
      undefined,
      normalized.hashtags,
    );

    return NextResponse.json({
      translation: {
        mode: body.mode,
        hook: fitted.hook,
        body: fitted.body,
        ps: fitted.ps,
        hashtags: normalized.hashtags,
        exportText,
        generatedAt: new Date().toISOString(),
      },
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
