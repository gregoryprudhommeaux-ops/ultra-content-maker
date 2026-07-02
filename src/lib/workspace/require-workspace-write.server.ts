import type { Firestore } from "firebase-admin/firestore";

/** Whether actorUid may read/write workspace data for ownerId/accountId. */
export async function canWriteWorkspace(
  db: Firestore,
  actorUid: string,
  ownerId: string,
  accountId: string,
): Promise<boolean> {
  if (!actorUid || !ownerId) return false;
  if (actorUid === ownerId) return true;

  const [ownerSnap, actorSnap] = await Promise.all([
    db.doc(`users/${ownerId}`).get(),
    db.doc(`users/${actorUid}`).get(),
  ]);

  const managedBy = ownerSnap.data()?.managedBy as { adminUid?: string } | undefined;
  if (managedBy?.adminUid === actorUid) return true;

  const linked = actorSnap.data()?.linkedWorkspace as
    | { ownerId?: string; accountId?: string }
    | undefined;
  return linked?.ownerId === ownerId && linked?.accountId === accountId;
}
