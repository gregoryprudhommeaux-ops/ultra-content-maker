import { configFromUserLlm, type LlmConfig } from "@/lib/llm/config";
import { chatCompletionJson } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildInspirationUrlFetchSystemPrompt,
  buildInspirationUrlFetchUserPrompt,
  normalizeInspirationUrlFetchResult,
  type InspirationUrlFetchLlmResult,
} from "@/lib/prompts/inspiration-url-fetch";
import type { ContentLanguage } from "@/types/workspace";
import {
  extractTextFromHtml,
  trimExcerpt,
} from "@/lib/inspiration/extract-html-text";
import { assertSafePublicUrl, isLinkedInUrl } from "@/lib/inspiration/url-safety";

const MIN_EXCERPT_CHARS = 40;
const MAX_HTML_BYTES = 512_000;
const FETCH_TIMEOUT_MS = 14_000;

export type InspirationFetchMethod = "http" | "llm";

export type InspirationUrlFetchResult = {
  excerpt: string;
  title?: string;
  method: InspirationFetchMethod;
};

async function fetchViaHttp(url: string): Promise<InspirationUrlFetchResult | null> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/html, text/plain, application/xhtml+xml",
      "User-Agent":
        "Mozilla/5.0 (compatible; UltraContentMaker/1.0; +https://github.com/gregoryprudhommeaux-ops/ultra-content-maker)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) return null;

  const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
  if (
    !contentType.includes("text/html") &&
    !contentType.includes("text/plain") &&
    !contentType.includes("application/xhtml")
  ) {
    return null;
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_HTML_BYTES) return null;

  const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  const plain = extractTextFromHtml(html);
  if (plain.length < MIN_EXCERPT_CHARS) return null;

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch
    ? extractTextFromHtml(titleMatch[1]).slice(0, 200)
    : undefined;

  return {
    excerpt: trimExcerpt(plain),
    title: title || undefined,
    method: "http",
  };
}

async function fetchViaLlm(
  url: string,
  llm: LlmConfig,
  contentLanguage: ContentLanguage,
): Promise<InspirationUrlFetchResult | null> {
  const raw = await chatCompletionJson(llm, [
    {
      role: "system",
      content: buildInspirationUrlFetchSystemPrompt(contentLanguage),
    },
    {
      role: "user",
      content: buildInspirationUrlFetchUserPrompt(url),
    },
  ]);

  const parsed = parseLlmJson<InspirationUrlFetchLlmResult>(raw);
  const normalized = normalizeInspirationUrlFetchResult(parsed);
  if (!normalized) return null;

  return {
    excerpt: trimExcerpt(normalized.excerpt),
    title: normalized.title || undefined,
    method: "llm",
  };
}

export type FetchInspirationUrlExcerptInput = {
  url: string;
  contentLanguage: ContentLanguage;
  llm: LlmConfig;
  /** Prefer Perplexity for LinkedIn / when HTTP fails */
  fallbackLlm?: LlmConfig | null;
};

export async function fetchInspirationUrlExcerpt(
  input: FetchInspirationUrlExcerptInput,
): Promise<InspirationUrlFetchResult> {
  const safeUrl = assertSafePublicUrl(input.url);
  const url = safeUrl.toString();
  const linkedIn = isLinkedInUrl(url);

  if (!linkedIn) {
    try {
      const httpResult = await fetchViaHttp(url);
      if (httpResult) return httpResult;
    } catch {
      /* fall through to LLM */
    }
  }

  const llmForWeb =
    input.llm.provider === "perplexity"
      ? input.llm
      : input.fallbackLlm?.provider === "perplexity"
        ? input.fallbackLlm
        : null;

  if (linkedIn && !llmForWeb) {
    throw new Error("linkedin_requires_perplexity");
  }

  if (!llmForWeb) {
    throw new Error("no_content");
  }

  const llmResult = await fetchViaLlm(url, llmForWeb, input.contentLanguage);
  if (llmResult) return llmResult;

  throw new Error("no_content");
}

export function resolveLlmConfigsForUrlFetch(input: {
  provider: import("@/types/workspace").LlmProvider;
  apiKey: string;
  model?: string;
}): { primary: LlmConfig; perplexity: LlmConfig | null } {
  const primary = configFromUserLlm(input);
  const envPerplexity = process.env.PERPLEXITY_API_KEY?.trim();
  const perplexity =
    input.provider === "perplexity"
      ? primary
      : envPerplexity
        ? configFromUserLlm({ provider: "perplexity", apiKey: envPerplexity })
        : null;
  return { primary, perplexity };
}
