import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { chatCompletionJson, mergeUsageLog, REVISE_CHAT_OPTIONS } from "@/lib/llm/chat";
import { resolveRequestLlm } from "@/lib/llm/resolve-request-llm";
import { requireArticleFeedbackLlm } from "@/lib/subscription/llm-gate.server";
import { recordArticleFeedbackServer } from "@/lib/subscription/subscription.server";
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
import { isPersonalArticleWritingStyle } from "@/lib/articles/article-writing-style";
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
  PostBrief,
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
  postBrief?: PostBrief;
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
  const userId = await verifyBearerUserId(request.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subGate = await requireArticleFeedbackLlm(userId);
  if (!subGate.ok) {
    return NextResponse.json(
      { error: subGate.code, subscription: subGate.access },
      { status: subGate.status },
    );
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
  const llm = await resolveRequestLlm(userId, body.llm);

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
    const personalVoice = isPersonalArticleWritingStyle(body.postBrief);
    const raw = await chatCompletionJson(
      llm,
      [
        {
          role: "system",
          content: buildReviseSystemPrompt(
            contentLanguage,
            emojiLevel,
            corrosiveTone,
            personalVoice,
          ),
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
      mergeUsageLog(userId, "articles/revise", REVISE_CHAT_OPTIONS),
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

    await recordArticleFeedbackServer(userId);

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
