import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";
import { deleteClientWorkspaceAccount } from "@/lib/admin/delete-client.server";
import type { ManagedClientEntry } from "@/types/workspace";
import { DEFAULT_ACCOUNT_ID } from "@/lib/workspace/workspace-scope";
import { isPlatformAdminUid } from "@/lib/workspace/platform-admin";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function cleanupLegacyAdminWorkspaceForClient(
  db: Firestore,
  adminUid: string,
  clientUid: string,
): Promise<void> {
  const clientSnap = await db.doc(`users/${clientUid}`).get();
  const linked = clientSnap.data()?.linkedWorkspace as
    | { ownerId?: string; accountId?: string }
    | undefined;

  if (linked?.ownerId === adminUid && linked.accountId && linked.accountId !== DEFAULT_ACCOUNT_ID) {
    try {
      await deleteClientWorkspaceAccount(db, adminUid, linked.accountId);
    } catch {
      /* account may already be gone */
    }
  }

  const invitesSnap = await db
    .collection("accountInvites")
    .where("usedBy", "==", clientUid)
    .get();

  for (const inv of invitesSnap.docs) {
    const data = inv.data() as { ownerId?: string; accountId?: string };
    if (
      data.ownerId === adminUid &&
      data.accountId &&
      data.accountId !== DEFAULT_ACCOUNT_ID
    ) {
      try {
        await deleteClientWorkspaceAccount(db, adminUid, data.accountId);
      } catch {
        /* ignore */
      }
    }
  }
}

export async function linkManagedClientByEmail(
  db: Firestore,
  auth: Auth,
  adminUid: string,
  rawEmail: string,
  accountId: string = DEFAULT_ACCOUNT_ID,
): Promise<ManagedClientEntry> {
  const email = normalizeEmail(rawEmail);
  if (!email.includes("@")) throw new Error("invalid_email");

  let clientUid: string;
  try {
    const userRecord = await auth.getUserByEmail(email);
    clientUid = userRecord.uid;
  } catch {
    throw new Error("user_not_found");
  }

  if (clientUid === adminUid) throw new Error("cannot_link_self");
  if (isPlatformAdminUid(clientUid)) throw new Error("cannot_link_admin");

  const clientRef = db.doc(`users/${clientUid}`);
  const clientSnap = await clientRef.get();
  if (!clientSnap.exists) throw new Error("client_doc_missing");

  const clientData = clientSnap.data()!;
  const existingManagedBy = clientData.managedBy as { adminUid?: string } | undefined;
  if (existingManagedBy?.adminUid && existingManagedBy.adminUid !== adminUid) {
    throw new Error("client_already_managed");
  }

  const accountSnap = await db.doc(`users/${clientUid}/accounts/${accountId}`).get();
  if (!accountSnap.exists) throw new Error("client_account_missing");

  await cleanupLegacyAdminWorkspaceForClient(db, adminUid, clientUid);

  const displayName =
    (clientData.displayName ? String(clientData.displayName) : null) ??
    (clientSnap.data()?.email ? String(clientData.email).split("@")[0] : email.split("@")[0]);

  const entry: ManagedClientEntry = {
    clientUid,
    accountId,
    email: String(clientData.email ?? email),
    displayName: displayName ?? undefined,
    linkedAt: new Date(),
  };

  await clientRef.set(
    {
      linkedWorkspace: FieldValue.delete(),
      managedBy: {
        adminUid,
        linkedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const adminRef = db.doc(`users/${adminUid}`);
  const adminSnap = await adminRef.get();
  const existing = (adminSnap.data()?.managedClients as ManagedClientEntry[] | undefined) ?? [];
  const filtered = existing.filter((row) => row.clientUid !== clientUid);
  filtered.push({
    ...entry,
    linkedAt: Timestamp.now().toDate(),
  });

  await adminRef.set(
    {
      managedClients: filtered.map((row) => ({
        clientUid: row.clientUid,
        accountId: row.accountId,
        email: row.email,
        displayName: row.displayName ?? null,
        linkedAt: row.linkedAt ?? FieldValue.serverTimestamp(),
      })),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return entry;
}

export async function unlinkManagedClient(
  db: Firestore,
  adminUid: string,
  clientUid: string,
): Promise<void> {
  const adminRef = db.doc(`users/${adminUid}`);
  const adminSnap = await adminRef.get();
  if (!adminSnap.exists) throw new Error("admin_not_found");

  const existing = (adminSnap.data()?.managedClients as ManagedClientEntry[] | undefined) ?? [];
  const next = existing.filter((row) => row.clientUid !== clientUid);
  if (next.length === existing.length) throw new Error("client_not_linked");

  await adminRef.update({
    managedClients: next,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const clientRef = db.doc(`users/${clientUid}`);
  const clientSnap = await clientRef.get();
  if (clientSnap.exists) {
    const managedBy = clientSnap.data()?.managedBy as { adminUid?: string } | undefined;
    if (managedBy?.adminUid === adminUid) {
      await clientRef.update({
        managedBy: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  if (adminSnap.data()?.activeAccountId?.startsWith("managed:")) {
    const active = String(adminSnap.data()?.activeAccountId);
    if (active.includes(clientUid)) {
      await adminRef.update({
        activeAccountId: DEFAULT_ACCOUNT_ID,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }
}

export async function listManagedClientsForAdmin(
  db: Firestore,
  adminUid: string,
): Promise<ManagedClientEntry[]> {
  const snap = await db.doc(`users/${adminUid}`).get();
  if (!snap.exists) return [];
  const rows = (snap.data()?.managedClients as ManagedClientEntry[] | undefined) ?? [];
  return rows.map((row) => ({
    clientUid: row.clientUid,
    accountId: row.accountId || DEFAULT_ACCOUNT_ID,
    email: row.email,
    displayName: row.displayName,
    linkedAt: row.linkedAt instanceof Timestamp ? row.linkedAt.toDate() : row.linkedAt,
  }));
}
