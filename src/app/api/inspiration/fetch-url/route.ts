import {
  fetchInspirationUrlExcerpt,
  resolveLlmConfigsForUrlFetch,
} from "@/lib/inspiration/fetch-url-excerpt";
import { getLlmConfig } from "@/lib/llm/config";
import { isInvalidApiKeyError } from "@/lib/llm/parse-json";
import type { ContentLanguage, LlmProvider } from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  url: string;
  contentLanguage?: string;
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
    if (!body.url?.trim()) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const contentLanguage = (body.contentLanguage || "fr") as ContentLanguage;
  const userLlm =
    body.llm?.apiKey?.trim()
      ? resolveLlmConfigsForUrlFetch({
          provider: body.llm.provider,
          apiKey: body.llm.apiKey.trim(),
          model: body.llm.model,
        })
      : null;

  const envLlm = getLlmConfig();
  const primary = userLlm?.primary ?? envLlm;
  if (!primary) {
    return NextResponse.json({ error: "no_llm_key" }, { status: 503 });
  }

  const perplexity = userLlm?.perplexity ?? (envLlm?.provider === "perplexity" ? envLlm : null);

  try {
    const result = await fetchInspirationUrlExcerpt({
      url: body.url,
      contentLanguage,
      llm: primary,
      fallbackLlm: perplexity,
    });

    return NextResponse.json({
      excerpt: result.excerpt,
      title: result.title,
      method: result.method,
      perplexityRecommended: primary.provider !== "perplexity" && !perplexity,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown";

    if (message === "url_invalid" || message === "url_blocked") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message === "linkedin_requires_perplexity") {
      return NextResponse.json(
        { error: message, perplexityRecommended: true },
        { status: 422 },
      );
    }
    if (message === "no_content") {
      return NextResponse.json({ error: message }, { status: 502 });
    }
    if (isInvalidApiKeyError(message)) {
      return NextResponse.json({ error: "invalid_api_key" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "fetch_failed", detail: message },
      { status: 502 },
    );
  }
}
