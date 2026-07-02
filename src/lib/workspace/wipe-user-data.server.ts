import { FieldValue, type Firestore } from "firebase-admin/firestore";

const BATCH_SIZE = 100;

/** Multi-document collections under users/{userId}/ */
const MULTI_COLLECTIONS = [
  "sources",
  "articles",
  "personaHistory",
  "ctas",
  "newsArchive",
  "bioDocuments",
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

function workspaceBasePath(userId: string, accountId?: string): string {
  return accountId ? `users/${userId}/accounts/${accountId}` : `users/${userId}`;
}

async function deleteSingletonDocs(
  db: Firestore,
  basePath: string,
  includeLlm: boolean,
  userId: string,
): Promise<void> {
  for (const [collectionId, docId] of SINGLETON_DOCS) {
    await db.doc(`${basePath}/${collectionId}/${docId}`).delete().catch(() => {});
  }
  if (includeLlm) {
    await db.doc(`users/${userId}/llm/profile`).delete().catch(() => {});
  }
}

async function deleteAccountWorkspace(
  db: Firestore,
  userId: string,
  accountId: string,
  includeLlm: boolean,
): Promise<void> {
  const base = workspaceBasePath(userId, accountId);
  for (const name of MULTI_COLLECTIONS) {
    await deleteCollection(db, `${base}/${name}`);
  }
  await deleteSingletonDocs(db, base, includeLlm, userId);
}

/** Identity + content workspace (keeps API key). Scoped to one account when accountId set. */
export async function wipeIdentityWorkspace(
  db: Firestore,
  userId: string,
  accountId?: string,
): Promise<void> {
  if (accountId) {
    await deleteAccountWorkspace(db, userId, accountId, false);
    return;
  }
  for (const name of MULTI_COLLECTIONS) {
    await deleteCollection(db, `users/${userId}/${name}`);
  }
  await deleteSingletonDocs(db, workspaceBasePath(userId), false, userId);
}

/** Full workspace wipe including API key and legacy clients. */
export async function wipeAllUserWorkspace(
  db: Firestore,
  userId: string,
  accountId?: string,
): Promise<void> {
  if (accountId) {
    await deleteAccountWorkspace(db, userId, accountId, true);
    await db.doc(`users/${userId}/accounts/${accountId}`).update({
      setupStep: "llm",
      updatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }
  await wipeIdentityWorkspace(db, userId);
  await deleteClientTrees(db, userId);
  const accountsSnap = await db.collection(`users/${userId}/accounts`).get();
  for (const accountDoc of accountsSnap.docs) {
    await deleteAccountWorkspace(db, userId, accountDoc.id, false);
    await accountDoc.ref.delete();
  }
  await deleteSingletonDocs(db, workspaceBasePath(userId), true, userId);
}

export async function resetUserProfile(
  db: Firestore,
  userId: string,
  accountId?: string,
): Promise<void> {
  await wipeIdentityWorkspace(db, userId, accountId);
  if (accountId) {
    await db.doc(`users/${userId}/accounts/${accountId}`).update({
      setupStep: "author",
      updatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }
  await db.doc(`users/${userId}`).update({
    setupStep: "author",
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteAllUserData(
  db: Firestore,
  userId: string,
  accountId?: string,
): Promise<void> {
  await wipeAllUserWorkspace(db, userId, accountId);
  if (!accountId) {
    await db.doc(`users/${userId}`).update({
      setupStep: "llm",
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}
