import { buildPostBriefInstruction } from "@/lib/prompts/post-brief";
import { buildNewsSourceCitationInstruction } from "@/lib/prompts/news-source-citation";
import type { ContentLanguage, NewsSuggestion, PostBrief } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export type ArticlesFromNewsPostCount = 2 | 4;

export function buildArticlesFromNewsExtraInstruction(
  contentLanguage: ContentLanguage,
  news: Pick<NewsSuggestion, "title" | "summary" | "url" | "publishedAt" | "sourceName">,
  postCount: ArticlesFromNewsPostCount = 4,
): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
  const scopeMix =
    postCount === 2
      ? "1 generalist + 1 niche"
      : "2 generalist + 2 niche";
  const scopeDetail =
    postCount === 2
      ? `- generalist: broader lesson or trend from the news for any professional in the field
- niche: expert/ICP-specific take, tactics, or implications`
      : `- generalist pair: broader lesson or trend from the news for any professional in the field
- niche pair: expert/ICP-specific take, tactics, or implications`;

  return `ANCHOR all ${postCount} posts on this news story (mandatory):
- Title: ${news.title}
- Summary: ${news.summary}
- URL: ${news.url}
- Published: ${news.publishedAt}
- Source: ${news.sourceName ?? "n/a"}

Each post must react to this story in ${lang} with a distinct angle (${scopeMix}):
${scopeDetail}
- Reference the news clearly (what happened / why it matters) without copying press wording verbatim
- Add the author's Persona voice and opinion — not a neutral press recap
- Do NOT invent facts beyond summary + reasonable inference from headline/context

${buildNewsSourceCitationInstruction(contentLanguage, {
  title: news.title,
  url: news.url,
  sourceName: news.sourceName,
})}`;
}

export function buildArticlesFromNewsUserPayload(
  baseUserPrompt: string,
  news: NewsSuggestion,
  contentLanguage: ContentLanguage,
  postCount: ArticlesFromNewsPostCount = 4,
  postBrief?: PostBrief,
): string {
  const extra = buildArticlesFromNewsExtraInstruction(contentLanguage, news, postCount);
  const brief = postBrief
    ? `\n\n---\n\n${buildPostBriefInstruction(postBrief, contentLanguage)}`
    : "";
  return `${baseUserPrompt}\n\n---\n\n${extra}${brief}`;
}
