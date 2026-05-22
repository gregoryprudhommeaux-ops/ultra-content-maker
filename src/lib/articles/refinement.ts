import type { ArticleRefinement } from "@/types/workspace";

export const REFINEMENT_IDS = [
  "tone",
  "theme",
  "length",
  "hook",
  "currentNews",
] as const;

export type StandardRefinementId = (typeof REFINEMENT_IDS)[number];

export const YES_NO_ONLY_QUESTIONS = new Set<string>(["currentNews"]);

export function createDefaultRefinement(): ArticleRefinement {
  return {
    emojiLevel: "light",
    toneEdge: "default",
    questions: REFINEMENT_IDS.map((id) => ({
      id,
      questionKey: id,
    })),
  };
}

/** Add new questions to articles created before a schema change. */
export function mergeRefinementWithDefaults(
  refinement: ArticleRefinement | undefined,
): ArticleRefinement {
  const base = createDefaultRefinement();
  if (!refinement) return base;
  const byId = new Map(refinement.questions.map((q) => [q.id, q]));
  return {
    emojiLevel: refinement.emojiLevel ?? base.emojiLevel,
    toneEdge: refinement.toneEdge ?? "default",
    globalComment: refinement.globalComment,
    lastRegeneratedAt: refinement.lastRegeneratedAt,
    questions: base.questions.map((d) => {
      const existing = byId.get(d.id);
      return existing ? { ...d, ...existing } : d;
    }),
  };
}

export function getCurrentNewsDetail(refinement: ArticleRefinement): string | undefined {
  const q = refinement.questions.find((x) => x.id === "currentNews");
  return q?.comment?.trim() || undefined;
}

export function isCurrentNewsEnabled(refinement: ArticleRefinement): boolean {
  const q = refinement.questions.find((x) => x.id === "currentNews");
  return q?.answer === "yes";
}

export function isCorrosiveToneEdge(refinement: ArticleRefinement): boolean {
  return refinement.toneEdge === "corrosive";
}

export function hasReviseInput(refinement: ArticleRefinement): boolean {
  if (isCorrosiveToneEdge(refinement)) return true;
  if (refinement.globalComment?.trim()) return true;
  return refinement.questions.some((q) => {
    if (q.id === "currentNews") {
      if (q.answer === "yes") return !!q.comment?.trim();
      return q.answer === "no";
    }
    return q.answer || q.comment?.trim();
  });
}
