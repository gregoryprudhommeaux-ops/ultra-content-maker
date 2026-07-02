import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { resolveContentRouteLlm } from "@/lib/llm/resolve-content-route-llm";
import { chatCompletionJson, mergeUsageLog } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import { normalizeHashtags } from "@/lib/linkedin/hashtags";
import {
  buildHashtagsSystemPrompt,
  buildHashtagsUserPrompt,
} from "@/lib/prompts/article-hashtags";
import { resolveAuthorSteering, type AuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import type { ContentLanguage, LlmProvider } from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HashtagsBody = {
  personaPromptText: string;
  contentLanguage: string;
  hook: string;
  body: string;
  ps?: string;
  ctaText?: string;
  profileEnrichment?: Record<string, unknown>;
  authorSteering?: AuthorSteeringPayload;
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

  let body: HashtagsBody;
  try {
    body = (await request.json()) as HashtagsBody;
    if (!body.personaPromptText?.trim() || !body.body?.trim() || !body.contentLanguage) {
      throw new Error("invalid");
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const contentLanguage = body.contentLanguage as ContentLanguage;
  const llm = await resolveContentRouteLlm(userId, body.llm);

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
        content: buildHashtagsSystemPrompt(contentLanguage),
      },
      {
        role: "user",
        content: `${body.personaPromptText}\n\n---\n\n${buildHashtagsUserPrompt({
          personaPromptText: body.personaPromptText,
          contentLanguage,
          hook: body.hook,
          body: body.body,
          ps: body.ps,
          ctaText: body.ctaText,
          profileEnrichment: body.profileEnrichment,
          authorSteering,
        })}`,
      },
    ], mergeUsageLog(userId, "articles/hashtags"));

    const parsed = parseLlmJson<{ hashtags?: unknown }>(raw);
    const hashtags = normalizeHashtags(parsed.hashtags);

    if (hashtags.length < 1) {
      return NextResponse.json({ error: "No hashtags in response" }, { status: 502 });
    }

    return NextResponse.json({ hashtags, model: llm.model });
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
