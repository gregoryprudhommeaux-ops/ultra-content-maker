import { normalizePostBrief } from "@/lib/articles/post-brief-objectives";
import type { PostBrief } from "@/types/workspace";

export const ARTICLE_TOPIC_CTA_PREFIX = "CTA / closing intention: ";

export type ArticleTopicFields = {
  topic: string;
  message: string;
  example: string;
  ctaHint: string;
};

export function parseArticleTopicFields(brief: PostBrief): ArticleTopicFields {
  const normalized = normalizePostBrief(brief);
  let example = normalized.proof.trim();
  let ctaHint = "";

  const ctaIndex = example.indexOf(ARTICLE_TOPIC_CTA_PREFIX);
  if (ctaIndex >= 0) {
    ctaHint = example.slice(ctaIndex + ARTICLE_TOPIC_CTA_PREFIX.length).trim();
    example = example.slice(0, ctaIndex).trim();
  }

  return {
    topic: normalized.problem,
    message: normalized.pointOfView,
    example,
    ctaHint,
  };
}
