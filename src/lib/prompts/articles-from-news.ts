import type { ContentLanguage, NewsSuggestion } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function buildArticlesFromNewsExtraInstruction(
  contentLanguage: ContentLanguage,
  news: Pick<NewsSuggestion, "title" | "summary" | "url" | "publishedAt" | "sourceName">,
): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";

  return `ANCHOR all 4 posts on this news story (mandatory):
- Title: ${news.title}
- Summary: ${news.summary}
- URL: ${news.url}
- Published: ${news.publishedAt}
- Source: ${news.sourceName ?? "n/a"}

Each post must react to this story in ${lang} with a distinct angle (2 generalist + 2 niche):
- generalist pair: broader lesson or trend from the news for any professional in the field
- niche pair: expert/ICP-specific take, tactics, or implications
- Reference the news clearly (what happened / why it matters) without copying press wording verbatim
- Add the author's Persona voice and opinion — not a neutral press recap
- Do NOT invent facts beyond summary + reasonable inference from headline/context`;
}

export function buildArticlesFromNewsUserPayload(
  baseUserPrompt: string,
  news: NewsSuggestion,
  contentLanguage: ContentLanguage,
): string {
  const extra = buildArticlesFromNewsExtraInstruction(contentLanguage, news);
  return `${baseUserPrompt}\n\n---\n\n${extra}`;
}
