import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";
import { deleteClientWorkspaceAccount } from "@/lib/admin/delete-client.server";
import type { ContentLanguage, ManagedClientEntry, SetupStep } from "@/types/workspace";
import { managedAccountId } from "@/lib/workspace/managed-clients";
import { DEFAULT_ACCOUNT_ID } from "@/lib/workspace/workspace-scope";
import { isPlatformAdminUid } from "@/lib/workspace/platform-admin";

export type ManagedWorkspaceAccountPayload = {
  id: string;
  name: string;
  contentLanguage: ContentLanguage;
  setupStep: SetupStep;
  isManaged: true;
  managedClientUid: string;
  managedClientEmail: string;
  createdAt: string;
  updatedAt: string;
};

function adminTimestampToIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return new Date().toISOString();
}

const LEGACY_SINGLETON_DOCS: ReadonlyArray<[string, string]> = [
  ["author", "profile"],
  ["audience", "profile"],
  ["persona", "current"],
  ["learning", "profile"],
  ["enrichment", "profile"],
  ["insights", "performance"],
];

const LEGACY_COLLECTIONS = [
  "sources",
  "articles",
  "personaHistory",
  "ctas",
  "newsArchive",
  "bioDocuments",
] as const;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function copyLegacyWorkspaceToAccountServer(
  db: Firestore,
  clientUid: string,
  accountId: string,
): Promise<void> {
  const batch = db.batch();
  let writes = 0;

  for (const [col, docId] of LEGACY_SINGLETON_DOCS) {
    const legacyRef = db.doc(`users/${clientUid}/${col}/${docId}`);
    const legacySnap = await legacyRef.get();
    if (!legacySnap.exists) continue;
    batch.set(
      db.doc(`users/${clientUid}/accounts/${accountId}/${col}/${docId}`),
      legacySnap.data()!,
      { merge: true },
    );
    writes++;
  }

  for (const colName of LEGACY_COLLECTIONS) {
    const legacySnap = await db.collection(`users/${clientUid}/${colName}`).get();
    for (const docSnap of legacySnap.docs) {
      batch.set(
        db.doc(`users/${clientUid}/accounts/${accountId}/${colName}/${docSnap.id}`),
        docSnap.data(),
        { merge: true },
      );
      writes++;
    }
  }

  if (writes > 0) await batch.commit();
}

/** Ensures users/{uid}/accounts/default exists (legacy users may only have root workspace). */
async function ensureClientDefaultAccount(
  db: Firestore,
  clientUid: string,
  clientData: Record<string, unknown>,
): Promise<string> {
  const accountId = DEFAULT_ACCOUNT_ID;
  const accountRef = db.doc(`users/${clientUid}/accounts/${accountId}`);
  const accountSnap = await accountRef.get();
  if (accountSnap.exists) return accountId;

  const email = String(clientData.email ?? "");
  const displayName = String(clientData.displayName ?? "").trim();
  const name =
    displayName ||
    email.split("@")[0]?.replace(/\./g, " ") ||
    "Mon compte";

  await accountRef.set(
    {
      name,
      contentLanguage: (clientData.preferredLocale as string) || "fr",
      setupStep: (clientData.setupStep as string) || "llm",
      isDefault: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await copyLegacyWorkspaceToAccountServer(db, clientUid, accountId);

  const userRef = db.doc(`users/${clientUid}`);
  const userSnap = await userRef.get();
  if (!userSnap.data()?.activeAccountId) {
    await userRef.set(
      { activeAccountId: accountId, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  }

  return accountId;
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

  return linkManagedClientByUserId(db, adminUid, clientUid, accountId);
}

export async function linkManagedClientByUserId(
  db: Firestore,
  adminUid: string,
  clientUid: string,
  accountId: string = DEFAULT_ACCOUNT_ID,
): Promise<ManagedClientEntry> {
  if (clientUid === adminUid) throw new Error("cannot_link_self");
  if (isPlatformAdminUid(clientUid)) throw new Error("cannot_link_admin");

  const clientRef = db.doc(`users/${clientUid}`);
  const clientSnap = await clientRef.get();
  if (!clientSnap.exists) throw new Error("client_doc_missing");

  const clientData = clientSnap.data()!;
  const email = normalizeEmail(String(clientData.email ?? ""));
  const existingManagedBy = clientData.managedBy as { adminUid?: string } | undefined;
  if (existingManagedBy?.adminUid && existingManagedBy.adminUid !== adminUid) {
    throw new Error("client_already_managed");
  }

  const resolvedAccountId = await ensureClientDefaultAccount(db, clientUid, clientData);
  const accountIdToLink = accountId?.trim() || resolvedAccountId;

  const accountSnap = await db.doc(`users/${clientUid}/accounts/${accountIdToLink}`).get();
  if (!accountSnap.exists) throw new Error("client_account_missing");

  await cleanupLegacyAdminWorkspaceForClient(db, adminUid, clientUid);

  const displayName =
    (clientData.displayName ? String(clientData.displayName) : null) ??
    (email ? email.split("@")[0] : "Client");

  const entry: ManagedClientEntry = {
    clientUid,
    accountId: accountIdToLink,
    email: email || String(clientData.email ?? ""),
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

function normalizeManagedClientRow(
  row: Partial<ManagedClientEntry> & { clientUid: string },
): ManagedClientEntry {
  return {
    clientUid: row.clientUid,
    accountId: row.accountId?.trim() || DEFAULT_ACCOUNT_ID,
    email: row.email?.trim() || "",
    displayName: row.displayName?.trim() || undefined,
    linkedAt: row.linkedAt instanceof Timestamp ? row.linkedAt.toDate() : row.linkedAt,
  };
}

/** Merges admin.managedClients with users where managedBy.adminUid matches (handles partial writes). */
export async function listManagedClientsForAdmin(
  db: Firestore,
  adminUid: string,
): Promise<ManagedClientEntry[]> {
  const byClientUid = new Map<string, ManagedClientEntry>();

  const adminSnap = await db.doc(`users/${adminUid}`).get();
  const rows = (adminSnap.data()?.managedClients as ManagedClientEntry[] | undefined) ?? [];
  for (const row of rows) {
    const clientUid = row.clientUid?.trim();
    if (!clientUid) continue;
    byClientUid.set(clientUid, normalizeManagedClientRow({ ...row, clientUid }));
  }

  const managedBySnap = await db
    .collection("users")
    .where("managedBy.adminUid", "==", adminUid)
    .get();
  for (const clientDoc of managedBySnap.docs) {
    const clientUid = clientDoc.id;
    if (byClientUid.has(clientUid)) continue;
    const data = clientDoc.data();
    const email = String(data.email ?? "").trim();
    byClientUid.set(
      clientUid,
      normalizeManagedClientRow({
        clientUid,
        accountId: String(data.activeAccountId ?? DEFAULT_ACCOUNT_ID),
        email,
        displayName: data.displayName ? String(data.displayName) : undefined,
      }),
    );
  }

  return [...byClientUid.values()].sort((a, b) =>
    (a.displayName ?? a.email).localeCompare(b.displayName ?? b.email, undefined, {
      sensitivity: "base",
    }),
  );
}

export async function listManagedWorkspaceAccountsForAdmin(
  db: Firestore,
  adminUid: string,
): Promise<ManagedWorkspaceAccountPayload[]> {
  const entries = await listManagedClientsForAdmin(db, adminUid);
  const results = await Promise.all(
    entries.map(async (entry) => {
      const clientAccountId = entry.accountId || DEFAULT_ACCOUNT_ID;
      const accountSnap = await db
        .doc(`users/${entry.clientUid}/accounts/${clientAccountId}`)
        .get();
      const accountData = accountSnap.exists ? accountSnap.data()! : null;
      const name =
        entry.displayName?.trim() ||
        (accountData?.name ? String(accountData.name) : null) ||
        entry.email.split("@")[0] ||
        "Client";

      return {
        id: managedAccountId(entry.clientUid, clientAccountId),
        name,
        contentLanguage: (accountData?.contentLanguage as ContentLanguage) ?? "fr",
        setupStep: (accountData?.setupStep as SetupStep) ?? "llm",
        isManaged: true as const,
        managedClientUid: entry.clientUid,
        managedClientEmail: entry.email,
        createdAt: adminTimestampToIso(accountData?.createdAt),
        updatedAt: adminTimestampToIso(accountData?.updatedAt),
      };
    }),
  );

  return results.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}
