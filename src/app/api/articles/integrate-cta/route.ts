import { configFromUserLlm, getLlmConfig } from "@/lib/llm/config";
import { chatCompletionJson } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildIntegrateCtaSystemPrompt,
  buildIntegrateCtaUserPrompt,
} from "@/lib/prompts/integrate-cta";
import type { ContentLanguage, CtaIntensity, LlmProvider } from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  hook: string;
  body: string;
  ps?: string;
  ctaDraft: string;
  ctaStyle?: CtaIntensity;
  contentLanguage: string;
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
    if (!body.body?.trim() || !body.ctaDraft?.trim()) {
      throw new Error("invalid");
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const contentLanguage = (body.contentLanguage || "fr") as ContentLanguage;
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
        content: buildIntegrateCtaSystemPrompt(contentLanguage),
      },
      {
        role: "user",
        content: buildIntegrateCtaUserPrompt({
          hook: body.hook,
          body: body.body,
          ps: body.ps,
          ctaDraft: body.ctaDraft,
          ctaStyle: body.ctaStyle ?? "medium",
        }),
      },
    ]);

    const parsed = parseLlmJson<{ closingBlock?: string }>(raw);
    const closingBlock = parsed.closingBlock?.trim();
    if (!closingBlock) {
      return NextResponse.json({ error: "Empty closing block" }, { status: 502 });
    }

    return NextResponse.json({ closingBlock });
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
