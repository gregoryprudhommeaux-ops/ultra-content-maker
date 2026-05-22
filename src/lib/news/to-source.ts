import type { ArticleNewsSource, NewsSuggestion } from "@/types/workspace";

export function newsToSource(item: NewsSuggestion): ArticleNewsSource {
  return {
    title: item.title,
    summary: item.summary,
    url: item.url,
    publishedAt: item.publishedAt,
    sourceName: item.sourceName,
  };
}
