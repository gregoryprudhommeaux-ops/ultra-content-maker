import {
  buildNewsSourceInFirstCommentInstruction,
} from "@/lib/prompts/news-source-citation";
import type {
  ArticleNewsSource,
  ContentLanguage,
  PostBrief,
} from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function buildFirstCommentSystemPrompt(
  contentLanguage: ContentLanguage,
  hasNewsSource = false,
): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";

  const linkRule = hasNewsSource
    ? "- You MUST include the news article source URL exactly as specified in newsSourceCitation (mandatory)."
    : "- No links unless essential";

  return `You write the author's FIRST comment under their own LinkedIn post (${lang}) to seed a quality discussion.

Rules:
- 2-4 short lines max
- Add context, a nuance, or a specific question — NOT "thanks for reading"
- No engagement bait, no "comment YES"
${linkRule}
- Sound human and expert; invite replies from the target ICP
- Align with post objective (especially conversation / credibility)

Return JSON only: { "comment": string }`;
}

export function buildFirstCommentUserPrompt(input: {
  hook: string;
  body: string;
  exportText?: string;
  postBrief?: PostBrief;
  personaExcerpt: string;
  contentLanguage?: ContentLanguage;
  newsSource?: Pick<ArticleNewsSource, "title" | "url" | "sourceName">;
}): string {
  const payload: Record<string, unknown> = {
    hook: input.hook,
    body: input.body,
    exportText: input.exportText ?? null,
    postBrief: input.postBrief ?? null,
    personaExcerpt: input.personaExcerpt.slice(0, 6000),
  };

  if (input.newsSource?.url && input.contentLanguage) {
    payload.newsSourceCitation = buildNewsSourceInFirstCommentInstruction(
      input.contentLanguage,
      input.newsSource,
    );
  }

  return JSON.stringify(payload, null, 2);
}

/** Ensure the news URL appears in the first comment if the model omitted it. */
export function ensureNewsSourceInFirstComment(
  comment: string,
  source: Pick<ArticleNewsSource, "title" | "url" | "sourceName">,
  contentLanguage: ContentLanguage,
): string {
  const url = source.url.trim();
  if (!url || comment.includes(url)) return comment.trim();

  const publisher = source.sourceName?.trim() || source.title.trim();
  const line =
    contentLanguage === "es"
      ? `Fuente: ${publisher} — ${url}`
      : contentLanguage === "en"
        ? `Source: ${publisher} — ${url}`
        : `Source : ${publisher} — ${url}`;

  return `${comment.trim()}\n\n${line}`;
}
