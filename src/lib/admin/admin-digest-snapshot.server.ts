import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

export type AdminDigestSnapshot = {
  mrrUsd: number;
  registeredUsers: number;
  validatedArticles: number;
  sentAt: string;
};

function snapshotRef(db: Firestore) {
  return db.collection("platform").doc("adminDigest").collection("snapshots").doc("latest");
}

export async function loadDigestSnapshot(db: Firestore): Promise<AdminDigestSnapshot | null> {
  const snap = await snapshotRef(db).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (typeof data?.mrrUsd !== "number") return null;
  return {
    mrrUsd: data.mrrUsd,
    registeredUsers: typeof data.registeredUsers === "number" ? data.registeredUsers : 0,
    validatedArticles:
      typeof data.validatedArticles === "number" ? data.validatedArticles : 0,
    sentAt: typeof data.sentAt === "string" ? data.sentAt : "",
  };
}

export async function saveDigestSnapshot(
  db: Firestore,
  snapshot: Omit<AdminDigestSnapshot, "sentAt">,
): Promise<void> {
  await snapshotRef(db).set({
    ...snapshot,
    sentAt: new Date().toISOString(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
