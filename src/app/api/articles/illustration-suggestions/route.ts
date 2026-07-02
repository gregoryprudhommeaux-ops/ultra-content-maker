import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { normalizeArticleIllustration } from "@/lib/articles/illustration";
import { resolveContentRouteLlm } from "@/lib/llm/resolve-content-route-llm";
import { chatCompletionJson, mergeUsageLog } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildIllustrationSystemPrompt,
  buildIllustrationUserPrompt,
} from "@/lib/prompts/article-illustration";
import type { ContentLanguage, LlmProvider } from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  contentLanguage: string;
  hook: string;
  body: string;
  ps?: string;
  scope?: string;
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
    if (!body.body?.trim() || !body.contentLanguage) {
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

  try {
    const raw = await chatCompletionJson(llm, [
      { role: "system", content: buildIllustrationSystemPrompt(contentLanguage) },
      {
        role: "user",
        content: buildIllustrationUserPrompt({
          hook: body.hook,
          body: body.body,
          ps: body.ps,
          scope: body.scope,
        }),
      },
    ], mergeUsageLog(userId, "articles/illustration-suggestions"));

    const parsed = parseLlmJson<Record<string, unknown>>(raw);
    const illustration = normalizeArticleIllustration(parsed);

    if (!illustration) {
      return NextResponse.json(
        { error: "Incomplete illustration suggestions" },
        { status: 502 },
      );
    }

    return NextResponse.json({ illustration });
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
