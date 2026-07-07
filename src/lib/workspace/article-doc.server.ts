import type { DocumentReference, DocumentSnapshot, Firestore } from "firebase-admin/firestore";
import { DEFAULT_ACCOUNT_ID } from "@/lib/workspace/workspace-scope";

export type ResolvedArticleDocument = {
  ref: DocumentReference;
  snap: DocumentSnapshot;
  ownerId: string;
  accountId: string;
};

/** Resolves an article doc under scoped or legacy workspace paths. */
export async function resolveArticleDocument(
  db: Firestore,
  ownerId: string,
  accountId: string,
  articleId: string,
): Promise<ResolvedArticleDocument | null> {
  const trimmedId = articleId.trim();
  if (!ownerId.trim() || !trimmedId) return null;

  const candidates: DocumentReference[] = [
    db.doc(`users/${ownerId}/accounts/${accountId}/articles/${trimmedId}`),
  ];
  if (accountId === DEFAULT_ACCOUNT_ID) {
    candidates.push(db.doc(`users/${ownerId}/articles/${trimmedId}`));
  }

  for (const ref of candidates) {
    const snap = await ref.get();
    if (snap.exists) {
      return { ref, snap, ownerId, accountId };
    }
  }

  return null;
}
