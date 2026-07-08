import type { DocumentReference, DocumentSnapshot, Firestore } from "firebase-admin/firestore";
import { DEFAULT_ACCOUNT_ID } from "@/lib/workspace/workspace-scope";

export type ResolvedArticleDocument = {
  ref: DocumentReference;
  snap: DocumentSnapshot;
  ownerId: string;
  accountId: string;
};

async function readArticleRef(
  ref: DocumentReference,
  ownerId: string,
  accountId: string,
): Promise<ResolvedArticleDocument | null> {
  const snap = await ref.get();
  if (!snap.exists) return null;
  return { ref, snap, ownerId, accountId };
}

/** Resolves an article doc under scoped or legacy workspace paths. */
export async function resolveArticleDocument(
  db: Firestore,
  ownerId: string,
  accountId: string,
  articleId: string,
): Promise<ResolvedArticleDocument | null> {
  const trimmedId = articleId.trim();
  const trimmedOwner = ownerId.trim();
  if (!trimmedOwner || !trimmedId) return null;

  const scoped = await readArticleRef(
    db.doc(`users/${trimmedOwner}/accounts/${accountId}/articles/${trimmedId}`),
    trimmedOwner,
    accountId,
  );
  if (scoped) return scoped;

  const legacy = await readArticleRef(
    db.doc(`users/${trimmedOwner}/articles/${trimmedId}`),
    trimmedOwner,
    DEFAULT_ACCOUNT_ID,
  );
  if (legacy) return legacy;

  const accountsSnap = await db.collection(`users/${trimmedOwner}/accounts`).get();
  for (const accountDoc of accountsSnap.docs) {
    if (accountDoc.id === accountId) continue;
    const found = await readArticleRef(
      db.doc(`users/${trimmedOwner}/accounts/${accountDoc.id}/articles/${trimmedId}`),
      trimmedOwner,
      accountDoc.id,
    );
    if (found) return found;
  }

  return null;
}
