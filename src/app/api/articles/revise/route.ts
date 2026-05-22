import { configFromUserLlm, getLlmConfig } from "@/lib/llm/config";
import { chatCompletionJson } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import { normalizeArticleScope } from "@/lib/articles/scope";
import { normalizeHashtags } from "@/lib/linkedin/hashtags";
import { isCorrosiveToneEdge } from "@/lib/articles/refinement";
import {
  buildReviseSystemPrompt,
  buildReviseUserPrompt,
} from "@/lib/prompts/article-revise";
import type {
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

  try {
    const emojiLevel = body.refinement.emojiLevel ?? "light";
    const corrosiveTone = isCorrosiveToneEdge(body.refinement);
    const raw = await chatCompletionJson(llm, [
      {
        role: "system",
        content: buildReviseSystemPrompt(contentLanguage, emojiLevel, corrosiveTone),
      },
      {
        role: "user",
        content: `${body.personaPromptText}\n\n---\n\n${buildReviseUserPrompt(
          body.personaPromptText,
          body.article,
          body.refinement,
          contentLanguage,
        )}`,
      },
    ]);

    const parsed = parseLlmJson<{
      hook?: string;
      body?: string;
      ps?: string;
      scope?: unknown;
      hashtags?: unknown;
    }>(raw);
    if (!parsed.body?.trim()) {
      return NextResponse.json({ error: "Empty revision" }, { status: 502 });
    }

    const hashtags = normalizeHashtags(parsed.hashtags);
    const fallbackTags = body.article.hashtags ?? [];
    const scope =
      normalizeArticleScope(parsed.scope) ??
      normalizeArticleScope(body.article.scope);

    return NextResponse.json({
      hook: parsed.hook?.trim() ?? body.article.hook,
      body: parsed.body.trim(),
      ps: parsed.ps?.trim() || undefined,
      scope,
      hashtags: hashtags.length ? hashtags : fallbackTags,
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
