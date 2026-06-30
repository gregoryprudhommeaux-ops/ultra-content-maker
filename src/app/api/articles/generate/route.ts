import { chatCompletionJson } from "@/lib/llm/chat";
import { llmErrorResponse } from "@/lib/llm/llm-route-error";
import { resolveRequestLlm } from "@/lib/llm/resolve-request-llm";
import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildArticlesFromNewsUserPayload,
} from "@/lib/prompts/articles-from-news";
import {
  buildInspirationArticleSystemPrompt,
  buildInspirationArticleUserPayload,
} from "@/lib/prompts/articles-from-inspiration";
import {
  buildArticlesSystemPromptWithCount,
  buildArticlesUserPromptWithCount,
  type ArticleGenerateCount,
} from "@/lib/prompts/articles-generate";
import { normalizePostBrief } from "@/lib/articles/post-brief-objectives";
import {
  BATCH_ARTICLE_COUNT,
  enforceBatchScopeMix,
  enforcePairScopeMix,
  hasValidBatchScopeMix,
  hasValidPairScopeMix,
  normalizeArticleScope,
  PAIR_ARTICLE_COUNT,
  SINGLE_ARTICLE_COUNT,
} from "@/lib/articles/scope";
import { normalizeHashtags } from "@/lib/linkedin/hashtags";
import { stripGenericLinkedInUrlsFromText } from "@/lib/linkedin/sanitize-post-link";
import {
  fitLinkedInArticleParts,
  maxDraftCharsForArticle,
} from "@/lib/linkedin/fit-linkedin-post";
import { stripNewsSourceUrlFromText } from "@/lib/linkedin/strip-news-source-url";
import { postContainsEmoji } from "@/lib/prompts/emoji-instruction";
import { resolveAuthorSteering, type AuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import type {
  ArticleInspirationSource,
  ArticleNewsSource,
  ArticleScope,
  ContentLanguage,
  EmojiLevel,
  LlmProvider,
  PostBrief,
} from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GenerateBody = {
  personaPromptText: string;
  contentLanguage: string;
  emojiLevel?: EmojiLevel;
  profileEnrichment?: Record<string, unknown>;
  authorSteering?: AuthorSteeringPayload;
  author?: Record<string, unknown>;
  audience?: Record<string, unknown>;
  newsInterestQuery?: string;
  newsSource?: ArticleNewsSource;
  inspirationText?: string;
  inspirationSource?: ArticleInspirationSource;
  targetScope?: ArticleScope;
  articleCount?: ArticleGenerateCount;
  postBrief?: PostBrief;
  llm?: {
    provider: LlmProvider;
    apiKey: string;
    model?: string;
  };
};

function parseArticlesFromResponse(raw: string) {
  const parsed = parseLlmJson<{
    articles?: {
      hook?: string;
      body?: string;
      ps?: string;
      scope?: unknown;
      hashtags?: unknown;
    }[];
  }>(raw);

  return (parsed.articles ?? [])
    .filter((a) => a.hook && a.body)
    .map((a) => {
      const hook = stripGenericLinkedInUrlsFromText(a.hook!.trim());
      const body = stripGenericLinkedInUrlsFromText(a.body!.trim());
      const ps = a.ps?.trim()
        ? stripGenericLinkedInUrlsFromText(a.ps.trim()) || undefined
        : undefined;
      return {
        hook,
        body,
        ps,
        scope: normalizeArticleScope(a.scope),
        hashtags: normalizeHashtags(a.hashtags),
      };
    });
}

function stripNewsUrlsFromArticles(
  articles: ReturnType<typeof parseArticlesFromResponse>,
  newsSource?: ArticleNewsSource,
) {
  if (!newsSource?.url) return articles;
  return articles.map((a) => ({
    ...a,
    hook: stripNewsSourceUrlFromText(a.hook, newsSource),
    body: stripNewsSourceUrlFromText(a.body, newsSource),
    ps: a.ps ? stripNewsSourceUrlFromText(a.ps, newsSource) || undefined : undefined,
  }));
}

function enforceLinkedInLengthOnArticles(
  articles: ReturnType<typeof parseArticlesFromResponse>,
) {
  return articles.map((a) => {
    const fitted = fitLinkedInArticleParts(
      { hook: a.hook, body: a.body, ps: a.ps },
      maxDraftCharsForArticle(a.hashtags),
    );
    return { ...a, ...fitted };
  });
}

function resolveArticleCount(raw?: number): ArticleGenerateCount {
  if (raw === 1) return 1;
  if (raw === 2) return 2;
  return 4;
}

export async function POST(request: Request) {
  const userId = await verifyBearerUserId(request.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
    if (!body.personaPromptText?.trim() || !body.contentLanguage) {
      throw new Error("invalid");
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const contentLanguage = body.contentLanguage as ContentLanguage;
  const emojiLevel = body.emojiLevel ?? "light";
  const articleCount = resolveArticleCount(body.articleCount);
  const expectedCount =
    articleCount === 1
      ? SINGLE_ARTICLE_COUNT
      : articleCount === 2
        ? PAIR_ARTICLE_COUNT
        : BATCH_ARTICLE_COUNT;
  const enforceScopeMix =
    articleCount === 1
      ? null
      : articleCount === 2
        ? enforcePairScopeMix
        : enforceBatchScopeMix;
  const hasValidScopeMix =
    articleCount === 1
      ? null
      : articleCount === 2
        ? hasValidPairScopeMix
        : hasValidBatchScopeMix;

  const targetScope: ArticleScope =
    body.targetScope === "niche" ? "niche" : "generalist";

  const postBrief = body.postBrief
    ? normalizePostBrief(body.postBrief)
    : undefined;

  const llm = await resolveRequestLlm(userId, body.llm);

  if (!llm) {
    return NextResponse.json({ error: "no_llm_key" }, { status: 503 });
  }

  try {
    const isInspiration = !!body.inspirationText?.trim();
    const authorSteering = resolveAuthorSteering({
      authorSteering: body.authorSteering,
      author: body.author,
      audience: body.audience,
      profileEnrichment: body.profileEnrichment,
      newsInterestQuery: body.newsInterestQuery,
    });

    let systemContent: string;
    let userContent: string;

    if (isInspiration) {
      systemContent = buildInspirationArticleSystemPrompt(
        contentLanguage,
        targetScope,
        emojiLevel,
      );
      userContent = `${body.personaPromptText}\n\n---\n\n${buildInspirationArticleUserPayload(
        body.personaPromptText,
        contentLanguage,
        body.inspirationText!,
        targetScope,
        postBrief,
        body.profileEnrichment,
        body.inspirationSource,
        authorSteering,
      )}`;
    } else {
      const baseUserPrompt = buildArticlesUserPromptWithCount(
        body.personaPromptText,
        contentLanguage,
        articleCount,
        body.profileEnrichment,
        emojiLevel,
        postBrief,
        authorSteering,
      );
      userContent = body.newsSource
        ? buildArticlesFromNewsUserPayload(
            baseUserPrompt,
            {
              id: "anchor",
              title: body.newsSource.title,
              summary: body.newsSource.summary,
              url: body.newsSource.url,
              publishedAt: body.newsSource.publishedAt,
              sourceName: body.newsSource.sourceName,
            },
            contentLanguage,
            articleCount === 1 ? 1 : articleCount === 2 ? 2 : 4,
            postBrief,
          )
        : baseUserPrompt;

      const systemExtra = body.newsSource
        ? "\n\nAll posts MUST anchor on the news story in the user message. Name the publisher in the text if useful — NEVER paste any https:// URL in hook, body, or PS (source link goes in the first comment only)."
        : "";

      systemContent = `${buildArticlesSystemPromptWithCount(contentLanguage, articleCount, emojiLevel)}${systemExtra}`;
      userContent = `${body.personaPromptText}\n\n---\n\n${userContent}`;
    }

    const raw = await chatCompletionJson(llm, [
      { role: "system", content: systemContent },
      { role: "user", content: userContent },
    ]);

    let articles = parseArticlesFromResponse(raw).slice(0, expectedCount);

    if (articles.length < 1) {
      return NextResponse.json({ error: "No articles in response" }, { status: 502 });
    }

    if (articleCount === 1 && isInspiration) {
      articles = articles.map((a) => ({
        ...a,
        scope: targetScope,
      }));
    } else if (enforceScopeMix) {
      articles = enforceScopeMix(articles);
    }

    if (articles.length < expectedCount) {
      return NextResponse.json(
        { error: `Expected ${expectedCount} articles in response` },
        { status: 502 },
      );
    }

    const needsEmojis = emojiLevel !== "none";
    const allMissingEmojis =
      needsEmojis && articles.every((a) => !postContainsEmoji(a));

    if (allMissingEmojis) {
      const retryRaw = await chatCompletionJson(llm, [
        {
          role: "system",
          content: `${systemContent}\n\nCRITICAL: Your previous output had ZERO emojis. Each post MUST include visible Unicode emojis per the emoji rule.`,
        },
        { role: "user", content: userContent },
      ]);
      const retryArticles = parseArticlesFromResponse(retryRaw).slice(0, expectedCount);
      if (retryArticles.length > 0) {
        articles =
          articleCount === 1 && isInspiration
            ? retryArticles.map((a) => ({ ...a, scope: targetScope }))
            : enforceScopeMix!(retryArticles);
      }
    }

    if (hasValidScopeMix) {
      const indexedForScope = articles.map((a, indexInBatch) => ({
        ...a,
        indexInBatch,
      }));
      if (!hasValidScopeMix(indexedForScope) && enforceScopeMix) {
        articles = enforceScopeMix(articles);
      }
    }

    if (body.newsSource?.url) {
      articles = stripNewsUrlsFromArticles(articles, body.newsSource);
    }

    articles = enforceLinkedInLengthOnArticles(articles);

    return NextResponse.json({ articles, model: llm.model });
  } catch (e) {
    return llmErrorResponse(e);
  }
}
