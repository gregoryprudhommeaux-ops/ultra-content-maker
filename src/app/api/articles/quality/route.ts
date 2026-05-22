import { configFromUserLlm, getLlmConfig } from "@/lib/llm/config";
import { chatCompletionJson } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildArticleQualitySystemPrompt,
  buildArticleQualityUserPrompt,
} from "@/lib/prompts/article-quality";
import type {
  ArticleQualityScores,
  ContentLanguage,
  LlmProvider,
  PostBrief,
} from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  contentLanguage: string;
  hook: string;
  body: string;
  ps?: string;
  postBrief?: PostBrief;
  personaPromptText: string;
  llm?: {
    provider: LlmProvider;
    apiKey: string;
    model?: string;
  };
};

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? Math.round(n) : Number(n);
  if (!Number.isFinite(v)) return 5;
  return Math.min(10, Math.max(1, v));
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
    if (!body.hook?.trim() || !body.body?.trim() || !body.personaPromptText?.trim()) {
      throw new Error("invalid");
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const contentLanguage = (body.contentLanguage || "en") as ContentLanguage;
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
        content: buildArticleQualitySystemPrompt(contentLanguage),
      },
      {
        role: "user",
        content: buildArticleQualityUserPrompt({
          hook: body.hook,
          body: body.body,
          ps: body.ps,
          postBrief: body.postBrief,
          personaExcerpt: body.personaPromptText,
        }),
      },
    ]);

    const parsed = parseLlmJson<{
      scores?: Partial<ArticleQualityScores>;
      alternativeHooks?: unknown;
      critique?: string;
    }>(raw);

    const scores: ArticleQualityScores = {
      nicheClarity: clampScore(parsed.scores?.nicheClarity),
      humanPov: clampScore(parsed.scores?.humanPov),
      proofDensity: clampScore(parsed.scores?.proofDensity),
      conversationPotential: clampScore(parsed.scores?.conversationPotential),
    };

    const rawHooks = Array.isArray(parsed.alternativeHooks)
      ? parsed.alternativeHooks
      : [];
    const alternativeHooks = rawHooks
      .filter((h): h is string => typeof h === "string" && h.trim().length > 0)
      .map((h) => h.trim())
      .slice(0, 3);

    return NextResponse.json({
      scores,
      alternativeHooks,
      critique: typeof parsed.critique === "string" ? parsed.critique.trim() : "",
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
