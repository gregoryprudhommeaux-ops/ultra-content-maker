import { normalizeArticleRepurpose } from "@/lib/articles/repurpose";
import { configFromUserLlm, getLlmConfig } from "@/lib/llm/config";
import { chatCompletionJson } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildRepurposeSystemPrompt,
  buildRepurposeUserPrompt,
} from "@/lib/prompts/article-repurpose";
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
    if (!body.hook?.trim() || !body.body?.trim()) throw new Error("invalid");
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
        }),
      },
    ]);

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
