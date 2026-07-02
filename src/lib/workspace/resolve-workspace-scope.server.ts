import type { Firestore } from "firebase-admin/firestore";
import { parseManagedAccountId } from "@/lib/workspace/managed-clients";
import { DEFAULT_ACCOUNT_ID } from "@/lib/workspace/workspace-scope";

export type ResolvedWorkspaceScope = {
  ownerId: string;
  accountId: string;
};

export async function resolveWorkspaceScopeForUser(
  db: Firestore,
  userId: string,
): Promise<ResolvedWorkspaceScope> {
  const snap = await db.doc(`users/${userId}`).get();
  const data = snap.data();

  const linked = data?.linkedWorkspace as
    | { ownerId?: string; accountId?: string }
    | undefined;
  if (linked?.ownerId && linked.accountId) {
    return { ownerId: linked.ownerId, accountId: linked.accountId };
  }

  const activeAccountId = String(data?.activeAccountId ?? DEFAULT_ACCOUNT_ID);
  const managed = parseManagedAccountId(activeAccountId);
  if (managed) {
    return { ownerId: managed.clientUid, accountId: managed.accountId };
  }

  return { ownerId: userId, accountId: activeAccountId || DEFAULT_ACCOUNT_ID };
}
