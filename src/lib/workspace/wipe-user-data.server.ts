import { FieldValue, type Firestore } from "firebase-admin/firestore";

const BATCH_SIZE = 100;

/** Multi-document collections under users/{userId}/ */
const MULTI_COLLECTIONS = [
  "sources",
  "articles",
  "personaHistory",
  "ctas",
  "newsArchive",
] as const;

/** Singleton docs: collectionId / documentId */
const SINGLETON_DOCS: ReadonlyArray<[string, string]> = [
  ["author", "profile"],
  ["audience", "profile"],
  ["persona", "current"],
  ["learning", "profile"],
  ["enrichment", "profile"],
  ["insights", "performance"],
];

async function deleteCollection(db: Firestore, collectionPath: string): Promise<void> {
  const colRef = db.collection(collectionPath);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await colRef.limit(BATCH_SIZE).get();
    if (snap.empty) return;
    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }
}

async function deleteClientTrees(db: Firestore, userId: string): Promise<void> {
  const clientsSnap = await db.collection(`users/${userId}/clients`).get();
  for (const clientDoc of clientsSnap.docs) {
    await deleteCollection(db, `users/${userId}/clients/${clientDoc.id}/onboarding`);
    await clientDoc.ref.delete();
  }
}

async function deleteSingletonDocs(
  db: Firestore,
  userId: string,
  includeLlm: boolean,
): Promise<void> {
  for (const [collectionId, docId] of SINGLETON_DOCS) {
    await db.doc(`users/${userId}/${collectionId}/${docId}`).delete().catch(() => {});
  }
  if (includeLlm) {
    await db.doc(`users/${userId}/llm/profile`).delete().catch(() => {});
  }
}

/** Identity + content workspace (keeps API key). */
export async function wipeIdentityWorkspace(db: Firestore, userId: string): Promise<void> {
  for (const name of MULTI_COLLECTIONS) {
    await deleteCollection(db, `users/${userId}/${name}`);
  }
  await deleteSingletonDocs(db, userId, false);
}

/** Full workspace wipe including API key and legacy clients. */
export async function wipeAllUserWorkspace(db: Firestore, userId: string): Promise<void> {
  await wipeIdentityWorkspace(db, userId);
  await deleteClientTrees(db, userId);
  await deleteSingletonDocs(db, userId, true);
}

export async function resetUserProfile(db: Firestore, userId: string): Promise<void> {
  await wipeIdentityWorkspace(db, userId);
  await db.doc(`users/${userId}`).update({
    setupStep: "author",
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteAllUserData(db: Firestore, userId: string): Promise<void> {
  await wipeAllUserWorkspace(db, userId);
  await db.doc(`users/${userId}`).update({
    setupStep: "llm",
    updatedAt: FieldValue.serverTimestamp(),
  });
}
