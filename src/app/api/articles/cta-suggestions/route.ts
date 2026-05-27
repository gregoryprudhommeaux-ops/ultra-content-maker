import { configFromUserLlm, getLlmConfig } from "@/lib/llm/config";
import { chatCompletionJson } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import { sanitizeCtaLinkUrl } from "@/lib/linkedin/sanitize-post-link";
import {
  buildCtaSuggestionsSystemPrompt,
  buildCtaSuggestionsUserPrompt,
} from "@/lib/prompts/cta-suggestions";
import { resolveAuthorSteering, type AuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import type {
  ContentLanguage,
  CtaIntensity,
  CtaSuggestion,
  LlmProvider,
  PostObjective,
} from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  personaPromptText: string;
  contentLanguage: string;
  hook: string;
  body: string;
  ps?: string;
  profileEnrichment?: Record<string, unknown>;
  postObjective?: PostObjective;
  authorSteering?: AuthorSteeringPayload;
  author?: Record<string, unknown>;
  audience?: Record<string, unknown>;
  llm?: {
    provider: LlmProvider;
    apiKey: string;
    model?: string;
  };
};

const STYLES: CtaIntensity[] = ["soft", "medium", "pushy"];

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
    if (!body.personaPromptText?.trim() || !body.body?.trim()) {
      throw new Error("invalid");
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const contentLanguage = body.contentLanguage as ContentLanguage;
  const postObjective: PostObjective =
    body.postObjective === "awareness" ||
    body.postObjective === "conversation" ||
    body.postObjective === "leads"
      ? body.postObjective
      : "credibility";
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
        content: buildCtaSuggestionsSystemPrompt(contentLanguage, postObjective),
      },
      {
        role: "user",
        content: `${body.personaPromptText}\n\n---\n\n${buildCtaSuggestionsUserPrompt({
          personaPromptText: body.personaPromptText,
          hook: body.hook,
          body: body.body,
          ps: body.ps,
          profileEnrichment: body.profileEnrichment,
          postObjective,
          authorSteering,
        })}`,
      },
    ]);

    const parsed = parseLlmJson<{
      suggestions?: { style?: string; text?: string; linkUrl?: string }[];
    }>(raw);

    const byStyle = new Map<CtaIntensity, CtaSuggestion>();
    for (const s of parsed.suggestions ?? []) {
      const style = s.style as CtaIntensity;
      if (!STYLES.includes(style) || !s.text?.trim()) continue;
      byStyle.set(style, {
        style,
        text: s.text.trim(),
        linkUrl: sanitizeCtaLinkUrl(s.linkUrl),
      });
    }

    const suggestions = STYLES.map((style) => byStyle.get(style)).filter(
      (s): s is CtaSuggestion => !!s,
    );

    if (suggestions.length < 3) {
      return NextResponse.json({ error: "Incomplete CTA suggestions" }, { status: 502 });
    }

    return NextResponse.json({ suggestions });
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
