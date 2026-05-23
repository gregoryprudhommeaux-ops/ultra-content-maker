import type { ArticleNewsSource, ContentLanguage } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

function publisherLabel(source: Pick<ArticleNewsSource, "title" | "sourceName">): string {
  return source.sourceName?.trim() || source.title.trim();
}

/** In-post: name the source, no URL (LinkedIn penalizes links in the main post). */
export function buildNewsSourceInPostInstruction(
  contentLanguage: ContentLanguage,
  source: Pick<ArticleNewsSource, "title" | "url" | "sourceName">,
): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
  const publisher = publisherLabel(source);

  return `NEWS SOURCE (mandatory — post anchored on this story):
- Publisher: ${publisher}
- Story URL (for reference only — do NOT paste in post): ${source.url.trim()}
- Write in ${lang}. React to what happened and why it matters for the ICP.
- Cite "${publisher}" by name in hook/body/PS if useful — NEVER paste any https:// URL in hook, body, or PS.
- The full source link will appear in the author's first comment under the post (not in the post text).`;
}

/** First comment under the post: full citation with URL. */
export function buildNewsSourceInFirstCommentInstruction(
  contentLanguage: ContentLanguage,
  source: Pick<ArticleNewsSource, "title" | "url" | "sourceName">,
): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
  const publisher = publisherLabel(source);
  const url = source.url.trim();

  return `NEWS SOURCE LINK (mandatory in this first comment):
- The main post intentionally has NO external URL (LinkedIn reach).
- You MUST include the article source with the full URL exactly once: ${url}
- Preferred line in ${lang}:
  - French: "Source : ${publisher} — ${url}"
  - English: "Source: ${publisher} — ${url}"
  - Spanish: "Fuente: ${publisher} — ${url}"
- Add 1 short line of context before or after (why this source backs the post).`;
}

/** @deprecated Use buildNewsSourceInPostInstruction */
export function buildNewsSourceCitationInstruction(
  contentLanguage: ContentLanguage,
  source: Pick<ArticleNewsSource, "title" | "url" | "sourceName">,
): string {
  return buildNewsSourceInPostInstruction(contentLanguage, source);
}
