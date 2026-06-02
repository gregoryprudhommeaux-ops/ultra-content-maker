import { configFromUserLlm, getLlmConfig } from "@/lib/llm/config";
import { chatCompletionJson, REVISE_CHAT_OPTIONS } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import { normalizeArticleScope } from "@/lib/articles/scope";
import { normalizeHashtags } from "@/lib/linkedin/hashtags";
import { stripGenericLinkedInUrlsFromText } from "@/lib/linkedin/sanitize-post-link";
import {
  fitLinkedInArticleParts,
  maxDraftCharsForArticle,
} from "@/lib/linkedin/fit-linkedin-post";
import { stripNewsSourceUrlFromText } from "@/lib/linkedin/strip-news-source-url";
import { isCorrosiveToneEdge } from "@/lib/articles/refinement";
import {
  buildReviseSystemPrompt,
  buildReviseUserPrompt,
} from "@/lib/prompts/article-revise";
import { resolveAuthorSteering, type AuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import type {
  ArticleNewsSource,
  ArticleRefinement,
  ContentLanguage,
  LlmProvider,
} from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviseBody = {
  personaPromptText: string;
  contentLanguage: string;
  article: {
    hook: string;
    body: string;
    ps?: string;
    scope?: string;
    hashtags?: string[];
  };
  refinement: ArticleRefinement;
  newsSource?: ArticleNewsSource;
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

  let body: ReviseBody;
  try {
    body = (await request.json()) as ReviseBody;
    if (!body.personaPromptText || !body.article?.body || !body.refinement) {
      throw new Error("invalid");
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const contentLanguage = body.contentLanguage as ContentLanguage;
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
    const emojiLevel = body.refinement.emojiLevel ?? "light";
    const corrosiveTone = isCorrosiveToneEdge(body.refinement);
    const raw = await chatCompletionJson(
      llm,
      [
        {
          role: "system",
          content: buildReviseSystemPrompt(contentLanguage, emojiLevel, corrosiveTone),
        },
        {
          role: "user",
          content: buildReviseUserPrompt(
            body.personaPromptText,
            body.article,
            body.refinement,
            contentLanguage,
            body.newsSource,
            authorSteering,
          ),
        },
      ],
      REVISE_CHAT_OPTIONS,
    );

    let parsed: {
      hook?: string;
      body?: string;
      ps?: string;
      scope?: unknown;
      hashtags?: unknown;
    };
    try {
      parsed = parseLlmJson(raw);
    } catch (e) {
      return NextResponse.json(
        {
          error: "invalid_json",
          detail: e instanceof Error ? e.message : "JSON parse failed",
        },
        { status: 502 },
      );
    }
    if (!parsed.body?.trim()) {
      return NextResponse.json({ error: "Empty revision" }, { status: 502 });
    }

    const hashtags = normalizeHashtags(parsed.hashtags);
    const fallbackTags = body.article.hashtags ?? [];
    const scope =
      normalizeArticleScope(parsed.scope) ??
      normalizeArticleScope(body.article.scope);

    const newsSource = body.newsSource;
    let hook = stripGenericLinkedInUrlsFromText(
      parsed.hook?.trim() ?? body.article.hook,
    );
    let revisedBody = stripGenericLinkedInUrlsFromText(parsed.body.trim());
    let ps = parsed.ps?.trim()
      ? stripGenericLinkedInUrlsFromText(parsed.ps.trim()) || undefined
      : undefined;

    if (newsSource?.url) {
      hook = stripNewsSourceUrlFromText(hook, newsSource);
      revisedBody = stripNewsSourceUrlFromText(revisedBody, newsSource);
      if (ps) ps = stripNewsSourceUrlFromText(ps, newsSource) || undefined;
    }

    const tags = hashtags.length ? hashtags : fallbackTags;
    const fitted = fitLinkedInArticleParts(
      { hook, body: revisedBody, ps },
      maxDraftCharsForArticle(tags),
    );

    return NextResponse.json({
      hook: fitted.hook,
      body: fitted.body,
      ps: fitted.ps,
      scope,
      hashtags: tags,
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
