import type { ArticleCreationMode, PostBrief } from "@/types/workspace";

type ArticleModeFields = {
  newsSource?: { url?: string } | null;
  inspirationSource?: unknown;
  postBrief?: PostBrief | null;
};

export const ARTICLE_CREATION_MODES: ArticleCreationMode[] = [
  "profile",
  "news",
  "inspiration",
  "article",
];

export function emptyCreationModeCounts(): Record<ArticleCreationMode, number> {
  return { profile: 0, news: 0, inspiration: 0, article: 0 };
}

/** Infers how a single article was created from stored metadata. */
export function inferArticleCreationMode(article: ArticleModeFields): ArticleCreationMode {
  if (article.newsSource?.url) return "news";
  if (article.inspirationSource) return "inspiration";
  const brief = article.postBrief;
  if (brief) {
    const proof = String(brief.proof ?? "").trim();
    const problem = String(brief.problem ?? "").trim();
    const pov = String(brief.pointOfView ?? "").trim();
    if (problem.length >= 8 && pov.length >= 8 && proof.length < 8) return "article";
  }
  return "profile";
}

export function tallyCreationModes<T extends ArticleModeFields>(
  articles: T[],
): Record<ArticleCreationMode, number> {
  const counts = emptyCreationModeCounts();
  for (const article of articles) {
    counts[inferArticleCreationMode(article)] += 1;
  }
  return counts;
}
