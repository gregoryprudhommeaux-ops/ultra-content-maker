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
import { normalizePostBrief } from "@/lib/articles/post-brief-objectives";
import { normalizeArticleTranslations } from "@/lib/articles/translation-locale";
import type {
  ArticleCreationMode,
  ArticleDoc,
  ArticlePerformanceSignals,
  ArticleQualityScores,
  ArticleRefinement,
  ArticleRepurpose,
  ArticleTranslationLocale,
  ArticleTranslations,
  ArticleTranslationVariant,
  ArticleScope,
  ArticleStatus,
  ContentLanguage,
  CtaIntensity,
  EmojiLevel,
  PostBrief,
  PostFormatPlan,
  RefinementAnswer,
  SlopAnalysis,
} from "@/types/workspace";
import { normalizeArticleIllustration } from "@/lib/articles/illustration";
import { normalizePostFormatPlan } from "@/lib/articles/post-format";
import { normalizeArticleRepurpose } from "@/lib/articles/repurpose";
import {
  createDefaultRefinement,
  hasReviseInput as hasRefinementInputImpl,
  serializeRefinementForFirestore,
} from "@/lib/articles/refinement";
import type {
  ArticleIllustration,
  ArticleInspirationSource,
  ArticleNewsSource,
} from "@/types/workspace";
import {
  batchSessionCreatedAt,
  inferBatchSessionMode,
} from "@/lib/articles/batch-session";
import { normalizeArticleScope } from "@/lib/articles/scope";
import {
  countLinkedInCharacters,
  LINKEDIN_POST_CHARACTER_LIMIT,
  truncateToLinkedInLimit,
} from "@/lib/linkedin/character-count";
import {
  fitLinkedInArticleParts,
  joinLinkedInPostParts,
} from "@/lib/linkedin/fit-linkedin-post";
import { formatHashtagsLine, normalizeHashtags } from "@/lib/linkedin/hashtags";
import {
  sanitizeCtaLinkUrl,
  stripGenericLinkedInUrlsFromText,
} from "@/lib/linkedin/sanitize-post-link";
import { toDate } from "./firestore-utils";
import {
  activeWorkspaceOwnerId,
  allowsLegacyWorkspaceFallback,
  legacyCollectionRef,
  legacyDocRef,
  workspaceCollectionRef,
  workspaceDocRef,
} from "./workspace-scope";

function articlesCollection(userId: string) {
  return workspaceCollectionRef(userId, "articles");
}

function articleDocRef(userId: string, articleId: string) {
  return workspaceDocRef(userId, "articles", articleId);
}

async function articlesCollectionWithLegacyFallback(userId: string) {
  const scoped = articlesCollection(userId);
  const scopedSnap = await getDocs(query(scoped, orderBy("createdAt", "desc")));
  if (!scopedSnap.empty) return scopedSnap;
  if (!allowsLegacyWorkspaceFallback(userId)) return scopedSnap;
  const legacy = legacyCollectionRef(activeWorkspaceOwnerId(userId), "articles");
  return getDocs(query(legacy, orderBy("createdAt", "desc")));
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
    inspirationSource: d.inspirationSource
      ? (d.inspirationSource as ArticleInspirationSource)
      : undefined,
    postBrief: d.postBrief ? normalizePostBrief(d.postBrief) : undefined,
    qualityScores: d.qualityScores
      ? (d.qualityScores as ArticleQualityScores)
      : undefined,
    alternativeHooks: Array.isArray(d.alternativeHooks)
      ? (d.alternativeHooks as string[])
      : undefined,
    qualityCritique: d.qualityCritique as string | undefined,
    postFormatPlan: normalizePostFormatPlan(d.postFormatPlan),
    repurpose: normalizeArticleRepurpose(d.repurpose),
    suggestedFirstComment: d.suggestedFirstComment as string | undefined,
    scheduledPublishAt: d.scheduledPublishAt
      ? toDate(d.scheduledPublishAt)
      : undefined,
    performanceSignals: d.performanceSignals
      ? (d.performanceSignals as ArticlePerformanceSignals)
      : undefined,
    slopAnalysis: d.slopAnalysis ? (d.slopAnalysis as SlopAnalysis) : undefined,
    translations: normalizeArticleTranslations(
      d.translations as ArticleTranslations | undefined,
    ),
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
    validatedAt: d.validatedAt ? toDate(d.validatedAt) : undefined,
    productionStatus: d.productionStatus as ArticleDoc["productionStatus"] | undefined,
    draftReviewToken: d.draftReviewToken as string | undefined,
    clientReviewFeedback: d.clientReviewFeedback as ArticleDoc["clientReviewFeedback"] | undefined,
  };
}

export type ArticleBatchGroup = {
  batchId: string;
  createdAt: Date;
  sessionMode: ArticleCreationMode;
  articles: ArticleDoc[];
};

export async function listValidatedArticles(userId: string): Promise<ArticleDoc[]> {
  const batches = await listArticleBatches(userId);
  return batches
    .flatMap((b) => b.articles)
    .filter((a) => a.status === "validated")
    .sort((a, b) => (b.validatedAt?.getTime() ?? 0) - (a.validatedAt?.getTime() ?? 0));
}

export const RECENT_ARTICLES_MAX = 20;
export const RECENT_ARTICLES_PREVIEW = 4;

/** Most recently updated articles across all batches (for creation hub). */
export async function listRecentArticles(
  userId: string,
  limit = RECENT_ARTICLES_MAX,
): Promise<ArticleDoc[]> {
  const batches = await listArticleBatches(userId);
  return batches
    .flatMap((b) => b.articles)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, limit);
}

export const SIDEBAR_DRAFTS_PREVIEW = 3;

function sortByValidatedOrUpdatedDesc(a: ArticleDoc, b: ArticleDoc): number {
  const aTime = a.validatedAt?.getTime() ?? a.updatedAt.getTime();
  const bTime = b.validatedAt?.getTime() ?? b.updatedAt.getTime();
  return bTime - aTime;
}

/** Most recently validated posts (sidebar “last post created”). */
export async function listRecentValidatedArticles(
  userId: string,
  limit = 1,
): Promise<ArticleDoc[]> {
  const batches = await listArticleBatches(userId);
  return batches
    .flatMap((b) => b.articles)
    .filter((a) => a.status === "validated")
    .sort(sortByValidatedOrUpdatedDesc)
    .slice(0, limit);
}

/** Draft or in-progress posts (sidebar “last drafts”). */
export async function listRecentDraftArticles(
  userId: string,
  limit = SIDEBAR_DRAFTS_PREVIEW,
): Promise<ArticleDoc[]> {
  const batches = await listArticleBatches(userId);
  return batches
    .flatMap((b) => b.articles)
    .filter((a) => a.status === "draft" || a.status === "refining")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, limit);
}

export async function listArticleBatches(userId: string): Promise<ArticleBatchGroup[]> {
  const snap = await articlesCollectionWithLegacyFallback(userId);
  const byBatch = new Map<string, ArticleDoc[]>();
  for (const d of snap.docs) {
    const article = mapArticle(d.id, d.data());
    const list = byBatch.get(article.batchId) ?? [];
    list.push(article);
    byBatch.set(article.batchId, list);
  }
  const groups = [...byBatch.entries()].map(([batchId, articles]) => {
    const sorted = [...articles].sort((a, b) => a.indexInBatch - b.indexInBatch);
    return {
      batchId,
      createdAt: batchSessionCreatedAt(sorted),
      sessionMode: inferBatchSessionMode(sorted),
      articles: sorted,
    };
  });
  return groups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getArticle(
  userId: string,
  articleId: string,
): Promise<ArticleDoc | null> {
  let snap = await getDoc(articleDocRef(userId, articleId));
  if (!snap.exists() && allowsLegacyWorkspaceFallback(userId)) {
    snap = await getDoc(legacyDocRef(activeWorkspaceOwnerId(userId), "articles", articleId));
  }
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
  postBrief?: PostBrief,
  inspirationSource?: ArticleInspirationSource,
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
      inspirationSource: inspirationSource ?? null,
      postBrief: postBrief ?? null,
      qualityScores: null,
      alternativeHooks: null,
      qualityCritique: null,
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

export async function saveArticleFormatPlan(
  userId: string,
  articleId: string,
  plan: PostFormatPlan,
) {
  await updateDoc(articleDocRef(userId, articleId), {
    postFormatPlan: {
      primaryFormat: plan.primaryFormat,
      rationale: plan.rationale,
      alternativeFormats: plan.alternativeFormats ?? null,
    },
    updatedAt: serverTimestamp(),
  });
}

export async function saveArticleTranslation(
  userId: string,
  articleId: string,
  targetLocale: ArticleTranslationLocale,
  variant: ArticleTranslationVariant,
  existing?: ArticleTranslations,
) {
  const translations: ArticleTranslations = {
    ...(existing ?? {}),
    [targetLocale]: variant,
  };
  await updateDoc(articleDocRef(userId, articleId), {
    translations,
    updatedAt: serverTimestamp(),
  });
  return translations;
}

export async function saveArticleRepurpose(
  userId: string,
  articleId: string,
  repurpose: ArticleRepurpose,
) {
  await updateDoc(articleDocRef(userId, articleId), {
    repurpose: {
      carousel: repurpose.carousel
        ? {
            slides: repurpose.carousel.slides,
            designNotes: repurpose.carousel.designNotes ?? null,
          }
        : null,
      videoScript: repurpose.videoScript
        ? {
            hookLine: repurpose.videoScript.hookLine,
            segments: repurpose.videoScript.segments,
            closingLine: repurpose.videoScript.closingLine,
            totalDurationSec: repurpose.videoScript.totalDurationSec ?? null,
          }
        : null,
    },
    updatedAt: serverTimestamp(),
  });
}

export async function saveArticlePerformanceSignals(
  userId: string,
  articleId: string,
  signals: ArticlePerformanceSignals,
) {
  await updateDoc(articleDocRef(userId, articleId), {
    performanceSignals: {
      saves: signals.saves ?? null,
      qualifiedComments: signals.qualifiedComments ?? null,
      profileVisits: signals.profileVisits ?? null,
      dms: signals.dms ?? null,
      businessOpportunity: signals.businessOpportunity?.trim() || null,
      notes: signals.notes?.trim() || null,
      recordedAt: signals.recordedAt ?? new Date().toISOString().slice(0, 10),
    },
    updatedAt: serverTimestamp(),
  });
}

export async function saveArticleSlopAnalysis(
  userId: string,
  articleId: string,
  slop: SlopAnalysis,
) {
  await updateDoc(articleDocRef(userId, articleId), {
    slopAnalysis: {
      humanScore: slop.humanScore,
      slopScore: slop.slopScore,
      flags: slop.flags,
      summary: slop.summary,
    },
    updatedAt: serverTimestamp(),
  });
}

export async function saveSuggestedFirstComment(
  userId: string,
  articleId: string,
  comment: string,
) {
  await updateDoc(articleDocRef(userId, articleId), {
    suggestedFirstComment: comment,
    updatedAt: serverTimestamp(),
  });
}

export async function saveArticleScheduledPublishAt(
  userId: string,
  articleId: string,
  scheduledPublishAt: Date | null,
) {
  await updateDoc(articleDocRef(userId, articleId), {
    scheduledPublishAt: scheduledPublishAt ?? null,
    updatedAt: serverTimestamp(),
  });
}

export async function saveArticleQuality(
  userId: string,
  articleId: string,
  data: {
    qualityScores: ArticleQualityScores;
    alternativeHooks: string[];
    qualityCritique?: string;
  },
) {
  await updateDoc(articleDocRef(userId, articleId), {
    qualityScores: data.qualityScores,
    alternativeHooks: data.alternativeHooks.slice(0, 3),
    qualityCritique: data.qualityCritique ?? null,
    updatedAt: serverTimestamp(),
  });
}

export async function saveArticleIllustration(
  userId: string,
  articleId: string,
  illustration: ArticleIllustration,
) {
  await updateDoc(articleDocRef(userId, articleId), {
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
  await updateDoc(articleDocRef(userId, articleId), {
    hook: data.hook,
    body: data.body,
    ps: data.ps ?? null,
    scope: data.scope ?? null,
    hashtags: data.hashtags?.length ? data.hashtags : null,
    updatedAt: serverTimestamp(),
  });
}

/** Replace draft content after inspiration regenerate (same article id). */
export async function replaceArticleDraft(
  userId: string,
  articleId: string,
  item: {
    hook: string;
    body: string;
    ps?: string;
    scope?: ArticleScope;
    hashtags?: string[];
  },
  postBrief?: PostBrief,
) {
  await updateDoc(articleDocRef(userId, articleId), {
    hook: item.hook,
    body: item.body,
    ps: item.ps ?? null,
    scope: item.scope ?? null,
    hashtags: item.hashtags?.length ? item.hashtags : null,
    postBrief: postBrief ?? null,
    status: "draft",
    exportText: null,
    qualityScores: null,
    alternativeHooks: null,
    qualityCritique: null,
    postFormatPlan: null,
    repurpose: null,
    suggestedFirstComment: null,
    validatedAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function saveArticleRefinement(
  userId: string,
  articleId: string,
  refinement: ArticleRefinement,
  status: ArticleStatus = "refining",
) {
  await updateDoc(articleDocRef(userId, articleId), {
    refinement: serializeRefinementForFirestore(refinement),
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
  } | null,
  hashtags?: string[],
  opts?: { idToken?: string; hook?: string; body?: string; ps?: string },
) {
  const token = opts?.idToken;
  if (token) {
    const res = await fetch("/api/articles/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        articleId,
        exportText,
        cta,
        hashtags,
        hook: opts.hook,
        body: opts.body,
        ps: opts.ps,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      subscription?: unknown;
    };
    if (!res.ok) {
      const err = new Error(data.error ?? "validate_failed");
      (err as Error & { code?: string }).code = data.error;
      throw err;
    }
    return;
  }

  const normalized = hashtags?.length ? normalizeHashtags(hashtags) : [];
  await updateDoc(articleDocRef(userId, articleId), {
    exportText,
    hashtags: normalized.length ? normalized : null,
    selectedCtaId: cta?.ctaId ?? null,
    selectedCtaStyle: cta?.style ?? null,
    selectedCtaText: cta?.text?.trim() ? cta.text : null,
    status: "validated",
    validatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function buildExportText(
  hook: string,
  body: string,
  ps: string | undefined,
  ctaText: string,
  linkUrl?: string,
  hashtags?: string[],
): string {
  const hookClean = stripGenericLinkedInUrlsFromText(hook.trim());
  const bodyClean = stripGenericLinkedInUrlsFromText(body.trim());
  const psClean = ps?.trim() ? stripGenericLinkedInUrlsFromText(ps.trim()) : "";
  const ctaClean = ctaText.trim() ? stripGenericLinkedInUrlsFromText(ctaText.trim()) : "";
  const link = sanitizeCtaLinkUrl(linkUrl);
  const tagLine = formatHashtagsLine(hashtags ?? []);

  const footerParts: string[] = [];
  if (ctaClean) footerParts.push(ctaClean);
  if (link) footerParts.push(link);
  if (tagLine) footerParts.push(tagLine);
  const footer = footerParts.join("\n\n");
  const footerLen = footer
    ? countLinkedInCharacters(footer) + 2
    : 0;

  const fitted = fitLinkedInArticleParts(
    { hook: hookClean, body: bodyClean, ps: psClean || undefined },
    Math.max(200, LINKEDIN_POST_CHARACTER_LIMIT - footerLen),
  );

  const main = joinLinkedInPostParts(fitted);
  const combined = footer ? `${main}\n\n${footer}` : main;
  return truncateToLinkedInLimit(combined);
}

/** @deprecated Use hasReviseInput from refinement module */
export function hasRefinementInput(refinement: ArticleRefinement): boolean {
  return hasRefinementInputImpl(refinement);
}

export type { RefinementAnswer };
