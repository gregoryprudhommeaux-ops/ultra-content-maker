import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import type {
  ArticleDoc,
  ArticleRefinement,
  ArticleScope,
  ArticleStatus,
  ContentLanguage,
  CtaIntensity,
  EmojiLevel,
  RefinementAnswer,
} from "@/types/workspace";
import { normalizeArticleIllustration } from "@/lib/articles/illustration";
import { createDefaultRefinement, hasReviseInput as hasRefinementInputImpl } from "@/lib/articles/refinement";
import type { ArticleIllustration, ArticleNewsSource } from "@/types/workspace";
import { normalizeArticleScope } from "@/lib/articles/scope";
import { formatHashtagsLine, normalizeHashtags } from "@/lib/linkedin/hashtags";
import { getClientFirestore } from "@/lib/firebase/client";
import { toDate } from "./firestore-utils";

function articlesCollection(userId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return collection(db, "users", userId, "articles");
}

function mapArticle(id: string, d: DocumentData): ArticleDoc {
  return {
    id,
    batchId: d.batchId as string,
    indexInBatch: d.indexInBatch as number,
    status: d.status as ArticleStatus,
    hook: (d.hook as string) ?? "",
    body: (d.body as string) ?? "",
    ps: d.ps as string | undefined,
    scope: normalizeArticleScope(d.scope),
    hashtags: d.hashtags
      ? normalizeHashtags(d.hashtags as string[])
      : undefined,
    exportText: d.exportText as string | undefined,
    selectedCtaId: d.selectedCtaId as string | undefined,
    selectedCtaStyle: d.selectedCtaStyle as CtaIntensity | undefined,
    selectedCtaText: d.selectedCtaText as string | undefined,
    contentLanguage: d.contentLanguage as ContentLanguage,
    refinement: d.refinement as ArticleRefinement | undefined,
    illustration: normalizeArticleIllustration(d.illustration),
    newsSource: d.newsSource
      ? (d.newsSource as ArticleNewsSource)
      : undefined,
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
    validatedAt: d.validatedAt ? toDate(d.validatedAt) : undefined,
  };
}

export type ArticleBatchGroup = {
  batchId: string;
  createdAt: Date;
  articles: ArticleDoc[];
};

export async function listArticleBatches(userId: string): Promise<ArticleBatchGroup[]> {
  const q = query(articlesCollection(userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const byBatch = new Map<string, ArticleDoc[]>();
  for (const d of snap.docs) {
    const article = mapArticle(d.id, d.data());
    const list = byBatch.get(article.batchId) ?? [];
    list.push(article);
    byBatch.set(article.batchId, list);
  }
  return [...byBatch.entries()].map(([batchId, articles]) => ({
    batchId,
    createdAt: articles[0]?.createdAt ?? new Date(),
    articles: articles.sort((a, b) => a.indexInBatch - b.indexInBatch),
  }));
}

export async function getArticle(
  userId: string,
  articleId: string,
): Promise<ArticleDoc | null> {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  const snap = await getDoc(doc(db, "users", userId, "articles", articleId));
  if (!snap.exists()) return null;
  return mapArticle(snap.id, snap.data());
}

export async function createArticleBatch(
  userId: string,
  batchId: string,
  items: {
    hook: string;
    body: string;
    ps?: string;
    scope?: ArticleScope;
    hashtags?: string[];
  }[],
  contentLanguage: ContentLanguage,
  emojiLevel: EmojiLevel = "light",
  newsSource?: ArticleNewsSource,
): Promise<string[]> {
  const refinement = { ...createDefaultRefinement(), emojiLevel };
  const ids: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const ref = await addDoc(articlesCollection(userId), {
      batchId,
      indexInBatch: i,
      status: "draft",
      hook: items[i].hook,
      body: items[i].body,
      ps: items[i].ps ?? null,
      scope: items[i].scope ?? (i < 2 ? "generalist" : "niche"),
      hashtags: items[i].hashtags?.length ? items[i].hashtags : null,
      newsSource: newsSource ?? null,
      exportText: null,
      selectedCtaId: null,
      selectedCtaStyle: null,
      selectedCtaText: null,
      contentLanguage,
      refinement,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      validatedAt: null,
    });
    ids.push(ref.id);
  }
  return ids;
}

export async function saveArticleIllustration(
  userId: string,
  articleId: string,
  illustration: ArticleIllustration,
) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  await updateDoc(doc(db, "users", userId, "articles", articleId), {
    illustration: {
      format: illustration.format,
      rationale: illustration.rationale,
      imagePrompts: illustration.imagePrompts,
      searchKeywords: illustration.searchKeywords ?? null,
      alternativeFormats: illustration.alternativeFormats ?? null,
    },
    updatedAt: serverTimestamp(),
  });
}

export async function updateArticleContent(
  userId: string,
  articleId: string,
  data: {
    hook: string;
    body: string;
    ps?: string;
    scope?: ArticleScope;
    hashtags?: string[];
  },
) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  await updateDoc(doc(db, "users", userId, "articles", articleId), {
    hook: data.hook,
    body: data.body,
    ps: data.ps ?? null,
    scope: data.scope ?? null,
    hashtags: data.hashtags?.length ? data.hashtags : null,
    updatedAt: serverTimestamp(),
  });
}

export async function saveArticleRefinement(
  userId: string,
  articleId: string,
  refinement: ArticleRefinement,
  status: ArticleStatus = "refining",
) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  await updateDoc(doc(db, "users", userId, "articles", articleId), {
    refinement,
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function markArticleRegenerated(
  userId: string,
  articleId: string,
  refinement: ArticleRefinement,
) {
  await saveArticleRefinement(userId, articleId, {
    ...refinement,
    lastRegeneratedAt: new Date(),
  });
}

export async function validateArticleWithCta(
  userId: string,
  articleId: string,
  exportText: string,
  cta: {
    ctaId?: string;
    style: CtaIntensity;
    text: string;
    linkUrl?: string;
  },
  hashtags?: string[],
) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  const normalized = hashtags?.length ? normalizeHashtags(hashtags) : [];
  await updateDoc(doc(db, "users", userId, "articles", articleId), {
    exportText,
    hashtags: normalized.length ? normalized : null,
    selectedCtaId: cta.ctaId ?? null,
    selectedCtaStyle: cta.style,
    selectedCtaText: cta.text,
    status: "validated",
    validatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function buildExportText(
  body: string,
  ps: string | undefined,
  ctaText: string,
  linkUrl?: string,
  hashtags?: string[],
): string {
  const parts = [body.trim()];
  if (ps?.trim()) parts.push(ps.trim());
  parts.push(ctaText.trim());
  if (linkUrl?.trim()) parts.push(linkUrl.trim());
  const tagLine = formatHashtagsLine(hashtags ?? []);
  if (tagLine) parts.push(tagLine);
  return parts.join("\n\n");
}

/** @deprecated Use hasReviseInput from refinement module */
export function hasRefinementInput(refinement: ArticleRefinement): boolean {
  return hasRefinementInputImpl(refinement);
}

export type { RefinementAnswer };
