import { configFromUserLlm, getLlmConfig } from "@/lib/llm/config";
import { chatCompletionJson } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildArticlesFromNewsUserPayload,
} from "@/lib/prompts/articles-from-news";
import {
  buildArticlesSystemPromptWithCount,
  buildArticlesUserPromptWithCount,
  type ArticleGenerateCount,
} from "@/lib/prompts/articles-generate";
import {
  BATCH_ARTICLE_COUNT,
  enforceBatchScopeMix,
  enforcePairScopeMix,
  hasValidBatchScopeMix,
  hasValidPairScopeMix,
  normalizeArticleScope,
  PAIR_ARTICLE_COUNT,
} from "@/lib/articles/scope";
import { normalizeHashtags } from "@/lib/linkedin/hashtags";
import { stripGenericLinkedInUrlsFromText } from "@/lib/linkedin/sanitize-post-link";
import {
  fitLinkedInArticleParts,
  maxDraftCharsForArticle,
} from "@/lib/linkedin/fit-linkedin-post";
import { stripNewsSourceUrlFromText } from "@/lib/linkedin/strip-news-source-url";
import { postContainsEmoji } from "@/lib/prompts/emoji-instruction";
import type {
  ArticleNewsSource,
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
  newsSource?: ArticleNewsSource;
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
      let hook = stripGenericLinkedInUrlsFromText(a.hook!.trim());
      let body = stripGenericLinkedInUrlsFromText(a.body!.trim());
      let ps = a.ps?.trim()
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

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
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
  const articleCount: ArticleGenerateCount = body.articleCount === 2 ? 2 : 4;
  const expectedCount = articleCount === 2 ? PAIR_ARTICLE_COUNT : BATCH_ARTICLE_COUNT;
  const enforceScopeMix =
    articleCount === 2 ? enforcePairScopeMix : enforceBatchScopeMix;
  const hasValidScopeMix =
    articleCount === 2 ? hasValidPairScopeMix : hasValidBatchScopeMix;

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

  try {
    const baseUserPrompt = buildArticlesUserPromptWithCount(
      body.personaPromptText,
      contentLanguage,
      articleCount,
      body.profileEnrichment,
      emojiLevel,
      body.postBrief,
    );
    const userContent = body.newsSource
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
          articleCount,
          body.postBrief,
        )
      : baseUserPrompt;

    const systemExtra = body.newsSource
      ? "\n\nAll posts MUST anchor on the news story in the user message. Name the publisher in the text if useful — NEVER paste any https:// URL in hook, body, or PS (source link goes in the first comment only)."
      : "";

    const raw = await chatCompletionJson(llm, [
      {
        role: "system",
        content: `${buildArticlesSystemPromptWithCount(contentLanguage, articleCount, emojiLevel)}${systemExtra}`,
      },
      {
        role: "user",
        content: `${body.personaPromptText}\n\n---\n\n${userContent}`,
      },
    ]);

    let articles = parseArticlesFromResponse(raw).slice(0, expectedCount);

    if (articles.length < 1) {
      return NextResponse.json({ error: "No articles in response" }, { status: 502 });
    }

    articles = enforceScopeMix(articles);

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
          content: `${buildArticlesSystemPromptWithCount(contentLanguage, articleCount, emojiLevel)}\n\nCRITICAL: Your previous output had ZERO emojis. Each post MUST include visible Unicode emojis per the emoji rule.`,
        },
        {
          role: "user",
          content: `${body.personaPromptText}\n\n---\n\n${userContent}`,
        },
      ]);
      const retryArticles = parseArticlesFromResponse(retryRaw).slice(0, expectedCount);
      if (retryArticles.length > 0) {
        articles = enforceScopeMix(retryArticles);
      }
    }

    const indexedForScope = articles.map((a, indexInBatch) => ({
      ...a,
      indexInBatch,
    }));
    if (!hasValidScopeMix(indexedForScope)) {
      articles = enforceScopeMix(articles);
    }

    if (body.newsSource?.url) {
      articles = stripNewsUrlsFromArticles(articles, body.newsSource);
    }

    articles = enforceLinkedInLengthOnArticles(articles);

    return NextResponse.json({ articles, model: llm.model });
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
