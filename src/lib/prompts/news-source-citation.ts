import type { ArticleNewsSource, ContentLanguage } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function buildNewsSourceCitationInstruction(
  contentLanguage: ContentLanguage,
  source: Pick<ArticleNewsSource, "title" | "url" | "sourceName">,
): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
  const publisher = source.sourceName?.trim() || source.title.trim();
  const url = source.url.trim();

  return `NEWS SOURCE CITATION (mandatory — posts are anchored on external news):
- Publisher: ${publisher}
- Article URL (use exactly, once per post): ${url}
- Write in ${lang}. Each post MUST credit the source in the body or PS with the full https URL visible (LinkedIn does not auto-link all clients — paste the URL plainly).
- Preferred formats:
  - French: "Source : ${publisher} — ${url}"
  - English: "Source: ${publisher} — ${url}"
  - Spanish: "Fuente: ${publisher} — ${url}"
- Do not use "link in comments" instead of the URL. Do not invent a different URL.`;
}
