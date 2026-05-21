import { configFromUserLlm, getLlmConfig } from "@/lib/llm/config";
import { chatCompletionJson } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildArticlesSystemPrompt,
  buildArticlesUserPrompt,
} from "@/lib/prompts/articles-generate";
import {
  BATCH_ARTICLE_COUNT,
  enforceBatchScopeMix,
  hasValidBatchScopeMix,
  normalizeArticleScope,
} from "@/lib/articles/scope";
import { normalizeHashtags } from "@/lib/linkedin/hashtags";
import { postContainsEmoji } from "@/lib/prompts/emoji-instruction";
import type { ContentLanguage, EmojiLevel, LlmProvider } from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GenerateBody = {
  personaPromptText: string;
  contentLanguage: string;
  emojiLevel?: EmojiLevel;
  profileEnrichment?: Record<string, unknown>;
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
    const raw = await chatCompletionJson(llm, [
      {
        role: "system",
        content: buildArticlesSystemPrompt(contentLanguage, emojiLevel),
      },
      {
        role: "user",
        content: `${body.personaPromptText}\n\n---\n\n${buildArticlesUserPrompt(
          body.personaPromptText,
          contentLanguage,
          body.profileEnrichment,
          emojiLevel,
        )}`,
      },
    ]);

    const parsed = parseLlmJson<{
      articles?: {
        hook?: string;
        body?: string;
        ps?: string;
        scope?: unknown;
        hashtags?: unknown;
      }[];
    }>(raw);

    let articles = (parsed.articles ?? [])
      .filter((a) => a.hook && a.body)
      .slice(0, 4)
      .map((a) => ({
        hook: a.hook!.trim(),
        body: a.body!.trim(),
        ps: a.ps?.trim() || undefined,
        scope: normalizeArticleScope(a.scope),
        hashtags: normalizeHashtags(a.hashtags),
      }));

    if (articles.length < 1) {
      return NextResponse.json({ error: "No articles in response" }, { status: 502 });
    }

    articles = enforceBatchScopeMix(articles);

    if (articles.length < BATCH_ARTICLE_COUNT) {
      return NextResponse.json(
        { error: "Expected 4 articles in response" },
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
          content: `${buildArticlesSystemPrompt(contentLanguage, emojiLevel)}\n\nCRITICAL: Your previous output had ZERO emojis. Each post MUST include visible Unicode emojis per the emoji rule.`,
        },
        {
          role: "user",
          content: `${body.personaPromptText}\n\n---\n\n${buildArticlesUserPrompt(
            body.personaPromptText,
            contentLanguage,
            body.profileEnrichment,
            emojiLevel,
          )}`,
        },
      ]);
      const retryParsed = parseLlmJson<{
        articles?: {
        hook?: string;
        body?: string;
        ps?: string;
        scope?: unknown;
        hashtags?: unknown;
      }[];
      }>(retryRaw);
      const retryArticles = (retryParsed.articles ?? [])
        .filter((a) => a.hook && a.body)
        .slice(0, 4)
        .map((a) => ({
          hook: a.hook!.trim(),
          body: a.body!.trim(),
          ps: a.ps?.trim() || undefined,
          scope: normalizeArticleScope(a.scope),
          hashtags: normalizeHashtags(a.hashtags),
        }));
      if (retryArticles.length > 0) {
        articles = enforceBatchScopeMix(retryArticles);
      }
    }

    const indexedForScope = articles.map((a, indexInBatch) => ({
      ...a,
      indexInBatch,
    }));
    if (!hasValidBatchScopeMix(indexedForScope)) {
      articles = enforceBatchScopeMix(articles);
    }

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
