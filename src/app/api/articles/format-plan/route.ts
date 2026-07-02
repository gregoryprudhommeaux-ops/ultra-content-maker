import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { normalizePostFormatPlan } from "@/lib/articles/post-format";
import { resolveContentRouteLlm } from "@/lib/llm/resolve-content-route-llm";
import { chatCompletionJson, mergeUsageLog } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildFormatPlanSystemPrompt,
  buildFormatPlanUserPrompt,
} from "@/lib/prompts/article-format-plan";
import { resolveAuthorSteering, type AuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import type { ContentLanguage, LlmProvider, PostBrief } from "@/types/workspace";
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

  let body: Body;
  try {
    body = (await request.json()) as Body;
    if (!body.hook?.trim() || !body.body?.trim()) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const contentLanguage = (body.contentLanguage || "en") as ContentLanguage;
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
      { role: "system", content: buildFormatPlanSystemPrompt(contentLanguage) },
      {
        role: "user",
        content: buildFormatPlanUserPrompt({
          hook: body.hook,
          body: body.body,
          ps: body.ps,
          postBrief: body.postBrief,
          personaExcerpt: body.personaPromptText ?? "",
          authorSteering,
        }),
      },
    ], mergeUsageLog(userId, "articles/format-plan"));

    const parsed = parseLlmJson<unknown>(raw);
    const plan = normalizePostFormatPlan(parsed);
    if (!plan) {
      return NextResponse.json({ error: "Invalid format plan" }, { status: 502 });
    }

    return NextResponse.json({ plan, model: llm.model });
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
