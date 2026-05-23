import type { ArticleRefinement } from "@/types/workspace";

export const REFINEMENT_IDS = ["tone", "theme", "length", "hook"] as const;

export type StandardRefinementId = (typeof REFINEMENT_IDS)[number];

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

export function isCorrosiveToneEdge(refinement: ArticleRefinement): boolean {
  return refinement.toneEdge === "corrosive";
}

export function hasReviseInput(refinement: ArticleRefinement): boolean {
  if (isCorrosiveToneEdge(refinement)) return true;
  if (refinement.globalComment?.trim()) return true;
  return refinement.questions.some((q) => q.answer || q.comment?.trim());
}

/** Firestore rejects `undefined` in nested fields — strip empties before updateDoc. */
export function serializeRefinementForFirestore(
  refinement: ArticleRefinement,
): Record<string, unknown> {
  const questions = refinement.questions.map((q) => {
    const row: Record<string, unknown> = {
      id: q.id,
      questionKey: q.questionKey,
    };
    if (q.answer) row.answer = q.answer;
    const comment = q.comment?.trim();
    if (comment) row.comment = comment;
    return row;
  });

  const out: Record<string, unknown> = {
    emojiLevel: refinement.emojiLevel ?? "light",
    toneEdge: refinement.toneEdge ?? "default",
    questions,
  };

  const globalComment = refinement.globalComment?.trim();
  if (globalComment) out.globalComment = globalComment;

  if (refinement.lastRegeneratedAt) {
    out.lastRegeneratedAt = refinement.lastRegeneratedAt;
  }

  return out;
}
