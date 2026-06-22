import {
  collection,
  doc,
  getDoc,
  type DocumentReference,
  type Firestore,
} from "firebase/firestore";
import { getClientFirestore } from "@/lib/firebase/client";

export const DEFAULT_ACCOUNT_ID = "default";

export type WorkspaceScope = {
  ownerId: string;
  accountId: string;
};

let activeScope: WorkspaceScope | null = null;

export function setActiveWorkspaceScope(scope: WorkspaceScope | null): void {
  activeScope = scope;
}

export function getActiveWorkspaceScope(): WorkspaceScope | null {
  return activeScope;
}

export function requireWorkspaceScope(ownerId: string): WorkspaceScope {
  if (activeScope) return activeScope;
  return { ownerId, accountId: DEFAULT_ACCOUNT_ID };
}

/** Legacy root paths only apply to the owner's default workspace — not client sub-accounts. */
export function allowsLegacyWorkspaceFallback(userId: string): boolean {
  const { accountId } = requireWorkspaceScope(userId);
  return accountId === DEFAULT_ACCOUNT_ID;
}

export function workspaceDocPathForAccount(
  ownerId: string,
  accountId: string,
  ...segments: string[]
): string[] {
  return ["users", ownerId, "accounts", accountId, ...segments];
}

export function workspaceDocPath(ownerId: string, ...segments: string[]): string[] {
  const { ownerId: o, accountId } = requireWorkspaceScope(ownerId);
  return workspaceDocPathForAccount(o, accountId, ...segments);
}

export function legacyDocPath(ownerId: string, ...segments: string[]): string[] {
  return ["users", ownerId, ...segments];
}

export function workspaceCollectionPath(ownerId: string, collection: string): string[] {
  return workspaceDocPath(ownerId, collection);
}

function requireDb(): Firestore {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return db;
}

export function workspaceDocRef(ownerId: string, ...segments: string[]): DocumentReference {
  return doc(requireDb(), ...(workspaceDocPath(ownerId, ...segments) as [string, ...string[]]));
}

export function legacyDocRef(ownerId: string, ...segments: string[]): DocumentReference {
  return doc(requireDb(), ...(legacyDocPath(ownerId, ...segments) as [string, ...string[]]));
}

export function workspaceCollectionRef(ownerId: string, collectionName: string) {
  const db = requireDb();
  const { ownerId: o, accountId } = requireWorkspaceScope(ownerId);
  return collection(db, "users", o, "accounts", accountId, collectionName);
}

export function legacyCollectionRef(ownerId: string, collectionName: string) {
  const db = requireDb();
  return collection(db, ...(legacyDocPath(ownerId, collectionName) as [string, ...string[]]));
}

/** Read scoped doc, then legacy root path (pre multi-account). */
export async function readScopedOrLegacyDoc(
  ownerId: string,
  map: (data: Record<string, unknown>) => Record<string, unknown>,
  ...segments: string[]
): Promise<Record<string, unknown> | null> {
  const scopedSnap = await getDoc(workspaceDocRef(ownerId, ...segments));
  if (scopedSnap.exists()) return map(scopedSnap.data() as Record<string, unknown>);
  if (!allowsLegacyWorkspaceFallback(ownerId)) return null;
  const legacySnap = await getDoc(legacyDocRef(ownerId, ...segments));
  if (legacySnap.exists()) return map(legacySnap.data() as Record<string, unknown>);
  return null;
}
