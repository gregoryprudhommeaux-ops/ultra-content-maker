import type { Firestore } from "firebase-admin/firestore";
import { DEFAULT_ACCOUNT_ID } from "@/lib/workspace/workspace-scope";
import type { ResolvedWorkspaceScope } from "@/lib/workspace/resolve-workspace-scope.server";

async function readDoc(
  db: Firestore,
  path: string,
): Promise<Record<string, unknown> | null> {
  const snap = await db.doc(path).get();
  if (!snap.exists) return null;
  return snap.data() as Record<string, unknown>;
}

function scopedBase(ownerId: string, accountId: string): string {
  return `users/${ownerId}/accounts/${accountId}`;
}

/** Read a singleton workspace doc with legacy root fallback for default account. */
export async function readWorkspaceSingletonDoc(
  db: Firestore,
  scope: ResolvedWorkspaceScope,
  ...segments: string[]
): Promise<Record<string, unknown> | null> {
  const scopedPath = `${scopedBase(scope.ownerId, scope.accountId)}/${segments.join("/")}`;
  const scoped = await readDoc(db, scopedPath);
  if (scoped) return scoped;
  if (scope.accountId !== DEFAULT_ACCOUNT_ID) return null;
  return readDoc(db, `users/${scope.ownerId}/${segments.join("/")}`);
}

/** List a workspace collection with legacy root fallback for default account. */
export async function listWorkspaceCollectionDocs(
  db: Firestore,
  scope: ResolvedWorkspaceScope,
  collectionName: string,
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const scopedPath = `${scopedBase(scope.ownerId, scope.accountId)}/${collectionName}`;
  const scopedSnap = await db.collection(scopedPath).get();
  if (!scopedSnap.empty) {
    return scopedSnap.docs.map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> }));
  }
  if (scope.accountId !== DEFAULT_ACCOUNT_ID) return [];
  const legacySnap = await db.collection(`users/${scope.ownerId}/${collectionName}`).get();
  return legacySnap.docs.map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> }));
}

export function workspaceScopedDocPath(
  scope: ResolvedWorkspaceScope,
  ...segments: string[]
): string {
  return `${scopedBase(scope.ownerId, scope.accountId)}/${segments.join("/")}`;
}
