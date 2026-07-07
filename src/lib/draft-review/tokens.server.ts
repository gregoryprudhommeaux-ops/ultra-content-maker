import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { randomBytes } from "crypto";
import { resolveArticleDocument } from "@/lib/workspace/article-doc.server";
import type { DraftReviewFeedback } from "@/types/workspace";

const COLLECTION = "draftReviewTokens";
const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type DraftReviewTokenStatus = "active" | "submitted" | "expired";

export type DraftReviewTokenRecord = {
  articleId: string;
  ownerId: string;
  accountId: string;
  expiresAt: Timestamp;
  status: DraftReviewTokenStatus;
  createdAt: Timestamp;
  createdBy?: string;
};

export type DraftReviewArticlePreview = {
  hook: string;
  body: string;
  ps?: string;
  contentLanguage: string;
};

function tokenRef(db: Firestore, token: string) {
  return db.collection(COLLECTION).doc(token);
}

export function generateDraftReviewToken(): string {
  return randomBytes(24).toString("base64url");
}

export function buildDraftReviewUrl(origin: string, locale: string, token: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/${locale}/review/${token}`;
}

export async function createDraftReviewToken(
  db: Firestore,
  input: {
    userId: string;
    accountId: string;
    articleId: string;
    createdBy?: string;
    locale?: string;
  },
): Promise<{ token: string; url: string; expiresAt: string }> {
  const resolved = await resolveArticleDocument(
    db,
    input.userId,
    input.accountId,
    input.articleId,
  );
  if (!resolved) throw new Error("article_not_found");

  const token = generateDraftReviewToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await tokenRef(db, token).set({
    articleId: input.articleId,
    ownerId: input.userId,
    accountId: input.accountId,
    expiresAt,
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
    createdBy: input.createdBy ?? null,
  });

  await resolved.ref.set(
    { draftReviewToken: token, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );

  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim()
    ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
    : process.env.VERCEL_URL?.trim()
      ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`
      : "http://127.0.0.1:3000";

  const locale = input.locale === "en" || input.locale === "es" ? input.locale : "fr";

  return {
    token,
    url: buildDraftReviewUrl(origin, locale, token),
    expiresAt: expiresAt.toISOString(),
  };
}

export async function getDraftReviewByToken(
  db: Firestore,
  token: string,
): Promise<{
  token: string;
  status: DraftReviewTokenStatus;
  expiresAt: string;
  article: DraftReviewArticlePreview;
} | null> {
  const snap = await tokenRef(db, token).get();
  if (!snap.exists) return null;

  const data = snap.data() as DraftReviewTokenRecord;
  const expiresAt = data.expiresAt.toDate();
  const isExpired = expiresAt.getTime() < Date.now();
  const status: DraftReviewTokenStatus = isExpired
    ? "expired"
    : data.status === "submitted"
      ? "submitted"
      : "active";

  const resolved = await resolveArticleDocument(
    db,
    data.ownerId,
    data.accountId,
    data.articleId,
  );
  if (!resolved) return null;

  const articleData = resolved.snap.data() ?? {};
  return {
    token,
    status,
    expiresAt: expiresAt.toISOString(),
    article: {
      hook: String(articleData.hook ?? ""),
      body: String(articleData.body ?? ""),
      ps: articleData.ps ? String(articleData.ps) : undefined,
      contentLanguage: String(articleData.contentLanguage ?? "fr"),
    },
  };
}

function formatFeedbackBlock(answers: Record<string, string>): string {
  return Object.entries(answers)
    .filter(([, v]) => v.trim())
    .map(([key, value]) => `${key}: ${value.trim()}`)
    .join("\n");
}

export async function submitDraftReview(
  db: Firestore,
  token: string,
  answers: Record<string, string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const snap = await tokenRef(db, token).get();
  if (!snap.exists) return { ok: false, error: "not_found" };

  const data = snap.data() as DraftReviewTokenRecord;
  if (data.expiresAt.toDate().getTime() < Date.now()) {
    return { ok: false, error: "expired" };
  }
  if (data.status === "submitted") {
    return { ok: false, error: "already_submitted" };
  }

  const feedback: DraftReviewFeedback = {
    answers,
    submittedAt: new Date().toISOString(),
  };

  const resolved = await resolveArticleDocument(
    db,
    data.ownerId,
    data.accountId,
    data.articleId,
  );
  if (!resolved) return { ok: false, error: "article_not_found" };

  const articleData = resolved.snap.data() ?? {};
  const existingComment =
    typeof articleData.refinement === "object" && articleData.refinement !== null
      ? String((articleData.refinement as { globalComment?: string }).globalComment ?? "")
      : "";
  const feedbackBlock = formatFeedbackBlock(answers);
  const reviewNote = `--- Client draft review ---\n${feedbackBlock}`;
  const globalComment = existingComment.trim()
    ? `${existingComment.trim()}\n\n${reviewNote}`
    : reviewNote;

  const refinement =
    typeof articleData.refinement === "object" && articleData.refinement !== null
      ? { ...(articleData.refinement as Record<string, unknown>), globalComment }
      : { questions: [], globalComment };

  await resolved.ref.update({
    clientReviewFeedback: feedback,
    productionStatus: "client_review",
    refinement,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await tokenRef(db, token).update({
    status: "submitted",
    submittedAt: FieldValue.serverTimestamp(),
  });

  return { ok: true };
}
