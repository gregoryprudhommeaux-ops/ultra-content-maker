import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { normalizeArticleRepurpose } from "@/lib/articles/repurpose";
import { chatCompletionJson, mergeUsageLog } from "@/lib/llm/chat";
import { resolveRequestLlm } from "@/lib/llm/resolve-request-llm";
import { requireActiveSubscriptionLlm } from "@/lib/subscription/llm-gate.server";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildRepurposeSystemPrompt,
  buildRepurposeUserPrompt,
} from "@/lib/prompts/article-repurpose";
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
  exportText?: string;
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

  const subGate = await requireActiveSubscriptionLlm(userId, { premium: true });
  if (!subGate.ok) {
    return NextResponse.json(
      { error: subGate.code, subscription: subGate.access },
      { status: subGate.status },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
    if (!body.hook?.trim() || !body.body?.trim()) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const contentLanguage = (body.contentLanguage || "en") as ContentLanguage;
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
    const raw = await chatCompletionJson(llm, [
      { role: "system", content: buildRepurposeSystemPrompt(contentLanguage) },
      {
        role: "user",
        content: buildRepurposeUserPrompt({
          hook: body.hook,
          body: body.body,
          ps: body.ps,
          exportText: body.exportText,
          postBrief: body.postBrief,
          personaExcerpt: body.personaPromptText ?? "",
          authorSteering,
        }),
      },
    ], mergeUsageLog(userId, "articles/repurpose"));

    const parsed = parseLlmJson<unknown>(raw);
    const repurpose = normalizeArticleRepurpose(parsed);
    if (!repurpose) {
      return NextResponse.json({ error: "Invalid repurpose output" }, { status: 502 });
    }

    return NextResponse.json({ repurpose, model: llm.model });
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
