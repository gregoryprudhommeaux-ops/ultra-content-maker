import {
 SCOPE_CARD_GENERALIST,
 SCOPE_CARD_NICHE,
} from "@/lib/ui/nextstep";
import type { ArticleScope } from "@/types/workspace";

export const BATCH_GENERALIST_COUNT = 2;
export const BATCH_NICHE_COUNT = 2;
export const BATCH_ARTICLE_COUNT =
 BATCH_GENERALIST_COUNT + BATCH_NICHE_COUNT;

export const PAIR_GENERALIST_COUNT = 1;
export const PAIR_NICHE_COUNT = 1;
export const PAIR_ARTICLE_COUNT = PAIR_GENERALIST_COUNT + PAIR_NICHE_COUNT;

export const SINGLE_ARTICLE_COUNT = 1;

export function normalizeArticleScope(raw: unknown): ArticleScope | undefined {
 const s = String(raw ?? "")
 .trim()
 .toLowerCase();
 if (s === "generalist" || s === "large" || s === "broad" || s === "general") {
 return "generalist";
 }
 if (s === "niche" || s === "specific" || s === "specialized") {
 return "niche";
 }
 return undefined;
}

/** Card chrome for list views · always pair with resolveArticleScope */
export const SCOPE_CARD_CLASS: Record<ArticleScope, string> = {
 generalist: `${SCOPE_CARD_GENERALIST} rounded-2xl border border-gray-100 p-4 transition-all hover:border-ns-primary hover:shadow-lg`,
 niche: `${SCOPE_CARD_NICHE} rounded-2xl border border-gray-100 p-4 transition-all hover:border-ns-secondary hover:shadow-lg`,
};

/** Stored scope, or batch position (posts 1–2 = generalist, 3–4 = niche). */
export function resolveArticleScope(article: {
 scope?: ArticleScope;
 indexInBatch: number;
}): ArticleScope {
 const normalized = article.scope
 ? normalizeArticleScope(article.scope)
 : undefined;
 if (normalized) return normalized;
 return article.indexInBatch < BATCH_GENERALIST_COUNT ? "generalist" : "niche";
}

export function countScopes(
 articles: { scope?: ArticleScope; indexInBatch: number }[],
): { generalist: number; niche: number } {
 let generalist = 0;
 let niche = 0;
 for (const a of articles) {
 if (resolveArticleScope(a) === "generalist") generalist += 1;
 else niche += 1;
 }
 return { generalist, niche };
}

/** True when exactly 2 generalist + 2 niche. */
export function hasValidBatchScopeMix(
 articles: { scope?: ArticleScope; indexInBatch: number }[],
): boolean {
 if (articles.length !== BATCH_ARTICLE_COUNT) return false;
 const { generalist, niche } = countScopes(articles);
 return generalist === BATCH_GENERALIST_COUNT && niche === BATCH_NICHE_COUNT;
}

/**
 * Guarantee exactly 4 posts with 2× generalist then 2× niche.
 * Preserves LLM-assigned scope when possible; fills gaps from unlabeled posts.
 */
export function enforceBatchScopeMix<T extends { scope?: ArticleScope }>(
 articles: T[],
): (T & { scope: ArticleScope })[] {
 const sized = articles.slice(0, BATCH_ARTICLE_COUNT);

 const generalistPool: T[] = [];
 const nichePool: T[] = [];
 const neutralPool: T[] = [];

 for (const a of sized) {
 if (a.scope === "generalist") generalistPool.push(a);
 else if (a.scope === "niche") nichePool.push(a);
 else neutralPool.push(a);
 }

 const generalist: T[] = generalistPool.slice(0, BATCH_GENERALIST_COUNT);
 const niche: T[] = nichePool.slice(0, BATCH_NICHE_COUNT);

 let neutralIdx = 0;
 while (generalist.length < BATCH_GENERALIST_COUNT && neutralIdx < neutralPool.length) {
 generalist.push(neutralPool[neutralIdx++]);
 }
 while (niche.length < BATCH_NICHE_COUNT && neutralIdx < neutralPool.length) {
 niche.push(neutralPool[neutralIdx++]);
 }

 const used = new Set([...generalist, ...niche]);
 const overflow = sized.filter((a) => !used.has(a));

 for (const a of overflow) {
 if (generalist.length < BATCH_GENERALIST_COUNT) generalist.push(a);
 else if (niche.length < BATCH_NICHE_COUNT) niche.push(a);
 }

 while (generalist.length < BATCH_GENERALIST_COUNT && niche.length > BATCH_NICHE_COUNT) {
 generalist.push(niche.pop()!);
 }
 while (niche.length < BATCH_NICHE_COUNT && generalist.length > BATCH_GENERALIST_COUNT) {
 niche.push(generalist.pop()!);
 }

 return [
 ...generalist
 .slice(0, BATCH_GENERALIST_COUNT)
 .map((a) => ({ ...a, scope: "generalist" as const })),
 ...niche
 .slice(0, BATCH_NICHE_COUNT)
 .map((a) => ({ ...a, scope: "niche" as const })),
 ];
}

/** True when exactly 1 generalist + 1 niche. */
export function hasValidPairScopeMix(
 articles: { scope?: ArticleScope; indexInBatch: number }[],
): boolean {
 if (articles.length !== PAIR_ARTICLE_COUNT) return false;
 const { generalist, niche } = countScopes(articles);
 return generalist === PAIR_GENERALIST_COUNT && niche === PAIR_NICHE_COUNT;
}

/** Guarantee exactly 2 posts: 1× generalist then 1× niche. */
export function enforcePairScopeMix<T extends { scope?: ArticleScope }>(
 articles: T[],
): (T & { scope: ArticleScope })[] {
 const sized = articles.slice(0, PAIR_ARTICLE_COUNT);
 const generalistPool: T[] = [];
 const nichePool: T[] = [];
 const neutralPool: T[] = [];

 for (const a of sized) {
 if (a.scope === "generalist") generalistPool.push(a);
 else if (a.scope === "niche") nichePool.push(a);
 else neutralPool.push(a);
 }

 const generalist: T[] = generalistPool.slice(0, PAIR_GENERALIST_COUNT);
 const niche: T[] = nichePool.slice(0, PAIR_NICHE_COUNT);

 let neutralIdx = 0;
 while (generalist.length < PAIR_GENERALIST_COUNT && neutralIdx < neutralPool.length) {
 generalist.push(neutralPool[neutralIdx++]);
 }
 while (niche.length < PAIR_NICHE_COUNT && neutralIdx < neutralPool.length) {
 niche.push(neutralPool[neutralIdx++]);
 }

 const used = new Set([...generalist, ...niche]);
 for (const a of sized.filter((x) => !used.has(x))) {
 if (generalist.length < PAIR_GENERALIST_COUNT) generalist.push(a);
 else if (niche.length < PAIR_NICHE_COUNT) niche.push(a);
 }

 while (generalist.length < PAIR_GENERALIST_COUNT && niche.length > PAIR_NICHE_COUNT) {
 generalist.push(niche.pop()!);
 }
 while (niche.length < PAIR_NICHE_COUNT && generalist.length > PAIR_GENERALIST_COUNT) {
 niche.push(generalist.pop()!);
 }

 return [
 ...generalist
 .slice(0, PAIR_GENERALIST_COUNT)
 .map((a) => ({ ...a, scope: "generalist" as const })),
 ...niche
 .slice(0, PAIR_NICHE_COUNT)
 .map((a) => ({ ...a, scope: "niche" as const })),
 ];
}

/** @deprecated Use enforceBatchScopeMix */
export const balanceArticleScopes = enforceBatchScopeMix;
