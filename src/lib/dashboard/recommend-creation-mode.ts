import {
  emptyCreationModeCounts,
} from "@/lib/articles/infer-creation-mode";
import type { ArticleCreationMode } from "@/types/workspace";

export type CreationModeRecommendation = {
  mode: ArticleCreationMode;
  reasonKey:
    | "strategyCache"
    | "inspirations"
    | "diversifyNews"
    | "topicIdea"
    | "profileDefault";
};

export function recommendCreationMode(input: {
  validatedCounts: Record<ArticleCreationMode, number>;
  inspirationSourcesCount: number;
  cachedRecommendedMode?: ArticleCreationMode | null;
}): CreationModeRecommendation {
  if (input.cachedRecommendedMode) {
    return { mode: input.cachedRecommendedMode, reasonKey: "strategyCache" };
  }

  const counts = input.validatedCounts ?? emptyCreationModeCounts();
  const totalValidated = Object.values(counts).reduce((a, b) => a + b, 0);

  if (input.inspirationSourcesCount > 0 && counts.inspiration < Math.max(1, totalValidated * 0.25)) {
    return { mode: "inspiration", reasonKey: "inspirations" };
  }

  if (counts.news === 0 && totalValidated >= 2) {
    return { mode: "news", reasonKey: "diversifyNews" };
  }

  if (counts.article === 0 && totalValidated >= 1) {
    return { mode: "article", reasonKey: "topicIdea" };
  }

  return { mode: "profile", reasonKey: "profileDefault" };
}
