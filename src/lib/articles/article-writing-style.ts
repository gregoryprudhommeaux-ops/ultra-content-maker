import type { ArticleWritingStyle, PostBrief } from "@/types/workspace";
import { normalizePostBrief } from "./post-brief-objectives";

export const ARTICLE_WRITING_STYLES: ArticleWritingStyle[] = ["linkedin", "personal"];

export function resolveArticleWritingStyle(
  brief?: PostBrief | null | undefined,
): ArticleWritingStyle {
  const style = normalizePostBrief(brief).articleWritingStyle;
  return style === "personal" ? "personal" : "linkedin";
}

export function isPersonalArticleWritingStyle(
  brief?: PostBrief | null | undefined,
): boolean {
  return resolveArticleWritingStyle(brief) === "personal";
}
