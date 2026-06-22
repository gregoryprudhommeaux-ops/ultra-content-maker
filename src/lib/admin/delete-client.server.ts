import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";
import { userLoginStatsRef } from "@/lib/admin/record-login-event.server";
import { isPlatformAdminUid } from "@/lib/workspace/platform-admin";
import { DEFAULT_ACCOUNT_ID } from "@/lib/workspace/workspace-scope";
import { wipeAllUserWorkspace } from "@/lib/workspace/wipe-user-data.server";

async function unlinkMembersFromWorkspace(
  db: Firestore,
  ownerId: string,
  accountId: string,
): Promise<void> {
  const snap = await db.collection("users").get();
  const batch = db.batch();
  let ops = 0;
  for (const doc of snap.docs) {
    const linked = doc.data().linkedWorkspace as
      | { ownerId?: string; accountId?: string }
      | undefined;
    if (linked?.ownerId === ownerId && linked?.accountId === accountId) {
      batch.update(doc.ref, {
        linkedWorkspace: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      ops += 1;
      if (ops >= 400) {
        await batch.commit();
        ops = 0;
      }
    }
  }
  if (ops > 0) await batch.commit();
}

async function deleteInvitesForAccount(
  db: Firestore,
  ownerId: string,
  accountId: string,
): Promise<void> {
  const snap = await db
    .collection("accountInvites")
    .where("ownerId", "==", ownerId)
    .where("accountId", "==", accountId)
    .get();
  if (snap.empty) return;
  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
}

/** Deletes one client workspace account under an admin owner (not the default account). */
export async function deleteClientWorkspaceAccount(
  db: Firestore,
  ownerId: string,
  accountId: string,
): Promise<void> {
  if (accountId === DEFAULT_ACCOUNT_ID) {
    throw new Error("cannot_delete_default_account");
  }

  const accountSnap = await db.doc(`users/${ownerId}/accounts/${accountId}`).get();
  if (!accountSnap.exists) {
    throw new Error("account_not_found");
  }

  await wipeAllUserWorkspace(db, ownerId, accountId);
  await unlinkMembersFromWorkspace(db, ownerId, accountId);
  await deleteInvitesForAccount(db, ownerId, accountId);
  await db.doc(`users/${ownerId}/accounts/${accountId}`).delete();

  const ownerSnap = await db.doc(`users/${ownerId}`).get();
  if (ownerSnap.exists && ownerSnap.data()?.activeAccountId === accountId) {
    await db.doc(`users/${ownerId}`).update({
      activeAccountId: DEFAULT_ACCOUNT_ID,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

/** Removes a registered user, their Firestore data, and Firebase Auth account. */
export async function deletePlatformUser(
  db: Firestore,
  auth: Auth,
  userId: string,
  actingAdminUid: string,
): Promise<void> {
  if (userId === actingAdminUid) {
    throw new Error("cannot_delete_self");
  }
  if (isPlatformAdminUid(userId)) {
    throw new Error("cannot_delete_admin");
  }

  const userSnap = await db.doc(`users/${userId}`).get();
  if (!userSnap.exists) {
    throw new Error("user_not_found");
  }

  await wipeAllUserWorkspace(db, userId);
  await userLoginStatsRef(db, userId).delete().catch(() => {});
  await db.doc(`users/${userId}`).delete();
  await auth.deleteUser(userId);
}
