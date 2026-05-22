import { buildNewsProfileContext } from "@/lib/news/profile-context";
import { normalizeNewsSuggestions } from "@/lib/news/normalize";
import { configFromUserLlm, getLlmConfig } from "@/lib/llm/config";
import { chatCompletionJson } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildNewsSuggestionsSystemPrompt,
  buildNewsSuggestionsUserPrompt,
} from "@/lib/prompts/news-suggestions";
import type { ContentLanguage, LlmProvider } from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  contentLanguage: string;
  author?: Record<string, unknown> | null;
  audience?: Record<string, unknown> | null;
  profileEnrichment?: Record<string, unknown>;
  personaExcerpt?: string;
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
    if (!body.contentLanguage) throw new Error("invalid");
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

  const profileContext = buildNewsProfileContext({
    author: body.author ?? null,
    audience: body.audience ?? null,
    profileEnrichment: body.profileEnrichment,
    personaExcerpt: body.personaExcerpt,
  });

  try {
    const raw = await chatCompletionJson(llm, [
      {
        role: "system",
        content: buildNewsSuggestionsSystemPrompt(contentLanguage),
      },
      {
        role: "user",
        content: buildNewsSuggestionsUserPrompt(profileContext),
      },
    ]);

    const parsed = parseLlmJson<{ news?: unknown }>(raw);
    const news = normalizeNewsSuggestions(parsed);

    if (news.length === 0) {
      return NextResponse.json(
        {
          error: "no_recent_news",
          perplexityRecommended: llm.provider !== "perplexity",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      news,
      provider: llm.provider,
      perplexityRecommended: llm.provider !== "perplexity",
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
