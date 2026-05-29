import type { ArticleCreationMode, ArticleDoc } from "@/types/workspace";

/** Infers how a batch was created from stored article metadata. */
export function inferBatchSessionMode(articles: ArticleDoc[]): ArticleCreationMode {
  if (articles.some((a) => a.newsSource?.url)) return "news";
  if (articles.some((a) => a.inspirationSource)) return "inspiration";
  return "profile";
}

/** Earliest createdAt in the batch (session start). */
export function batchSessionCreatedAt(articles: ArticleDoc[]): Date {
  if (articles.length === 0) return new Date();
  return articles.reduce(
    (min, a) => (a.createdAt.getTime() < min.getTime() ? a.createdAt : min),
    articles[0].createdAt,
  );
}
