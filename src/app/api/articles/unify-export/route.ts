import { configFromUserLlm, getLlmConfig } from "@/lib/llm/config";
import { chatCompletionJson } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildUnifyPostExportSystemPrompt,
  buildUnifyPostExportUserPrompt,
} from "@/lib/prompts/unify-post-export";
import { stripGenericLinkedInUrlsFromText } from "@/lib/linkedin/sanitize-post-link";
import type { ContentLanguage, CtaIntensity, LlmProvider } from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  hook: string;
  body: string;
  ps?: string;
  closingBlock: string;
  ctaStyle?: CtaIntensity;
  contentLanguage: string;
  llm?: {
    provider: LlmProvider;
    apiKey: string;
    model?: string;
  };
};

function cleanField(value: unknown): string {
  if (typeof value !== "string") return "";
  return stripGenericLinkedInUrlsFromText(value.trim());
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
    if (!body.hook?.trim() || !body.body?.trim() || !body.closingBlock?.trim()) {
      throw new Error("invalid");
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const contentLanguage = (body.contentLanguage || "fr") as ContentLanguage;
  const ctaStyle = body.ctaStyle ?? "medium";
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
        content: buildUnifyPostExportSystemPrompt(contentLanguage, ctaStyle),
      },
      {
        role: "user",
        content: buildUnifyPostExportUserPrompt({
          hook: body.hook,
          body: body.body,
          ps: body.ps,
          closingBlock: body.closingBlock,
          ctaStyle,
          contentLanguage,
        }),
      },
    ]);

    const parsed = parseLlmJson<{
      hook?: string;
      body?: string;
      ps?: string;
      closingBlock?: string;
    }>(raw);

    const hook = cleanField(parsed.hook) || body.hook.trim();
    const mainBody = cleanField(parsed.body) || body.body.trim();
    const closingBlock = cleanField(parsed.closingBlock) || body.closingBlock.trim();
    const psRaw = cleanField(parsed.ps);
    const ps = psRaw || undefined;

    if (!mainBody || !closingBlock) {
      return NextResponse.json({ error: "Empty unified post" }, { status: 502 });
    }

    return NextResponse.json({ hook, body: mainBody, ps, closingBlock });
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
