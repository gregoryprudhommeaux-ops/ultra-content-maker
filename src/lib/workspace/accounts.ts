import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import type { ContentLanguage, SetupStep } from "@/types/workspace";
import { getClientFirestore } from "@/lib/firebase/client";
import { isPlatformAdminEmail } from "./platform-admin";
import { toDate } from "./firestore-utils";
import {
  DEFAULT_ACCOUNT_ID,
  legacyDocPath,
  legacyDocRef,
  setActiveWorkspaceScope,
  workspaceDocPathForAccount,
  workspaceDocRef,
  type WorkspaceScope,
} from "./workspace-scope";

export type WorkspaceAccount = {
  id: string;
  name: string;
  contentLanguage: ContentLanguage;
  setupStep: SetupStep;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateWorkspaceAccountInput = {
  name: string;
  contentLanguage: ContentLanguage;
};

const ACTIVE_ACCOUNT_STORAGE_KEY = "ucm:active-account";

function accountsCollection(ownerId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return collection(db, "users", ownerId, "accounts");
}

function accountRef(ownerId: string, accountId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return doc(db, "users", ownerId, "accounts", accountId);
}

function mapAccount(id: string, data: Record<string, unknown>): WorkspaceAccount {
  return {
    id,
    name: data.name as string,
    contentLanguage: (data.contentLanguage as ContentLanguage) ?? "fr",
    setupStep: (data.setupStep as SetupStep) ?? "llm",
    isDefault: Boolean(data.isDefault),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function activeAccountStorageKey(ownerId: string): string {
  return `${ACTIVE_ACCOUNT_STORAGE_KEY}:${ownerId}`;
}

export function readStoredActiveAccountId(ownerId: string): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(activeAccountStorageKey(ownerId));
}

export function storeActiveAccountId(ownerId: string, accountId: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(activeAccountStorageKey(ownerId), accountId);
}

export async function listWorkspaceAccounts(ownerId: string): Promise<WorkspaceAccount[]> {
  const q = query(accountsCollection(ownerId), orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapAccount(d.id, d.data()));
}

export async function getWorkspaceAccount(
  ownerId: string,
  accountId: string,
): Promise<WorkspaceAccount | null> {
  const snap = await getDoc(accountRef(ownerId, accountId));
  if (!snap.exists()) return null;
  return mapAccount(snap.id, snap.data());
}

export async function createWorkspaceAccount(
  ownerId: string,
  input: CreateWorkspaceAccountInput,
): Promise<string> {
  const ref = await addDoc(accountsCollection(ownerId), {
    name: input.name.trim(),
    contentLanguage: input.contentLanguage,
    setupStep: "author",
    isDefault: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAccountSetupStep(
  ownerId: string,
  accountId: string,
  setupStep: SetupStep,
): Promise<void> {
  await updateDoc(accountRef(ownerId, accountId), {
    setupStep,
    updatedAt: serverTimestamp(),
  });
}

export async function setUserActiveAccountId(
  ownerId: string,
  accountId: string,
): Promise<void> {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  await updateDoc(doc(db, "users", ownerId), {
    activeAccountId: accountId,
    updatedAt: serverTimestamp(),
  });
}

async function legacyAuthorExists(ownerId: string): Promise<boolean> {
  const snap = await getDoc(legacyDocRef(ownerId, "author", "profile"));
  return snap.exists();
}

async function scopedAuthorExists(ownerId: string, accountId: string): Promise<boolean> {
  const db = getClientFirestore();
  if (!db) return false;
  const snap = await getDoc(
    doc(
      db,
      ...(workspaceDocPathForAccount(ownerId, accountId, "author", "profile") as [
        string,
        ...string[],
      ]),
    ),
  );
  return snap.exists();
}

const MIGRATION_MULTI_COLLECTIONS = [
  "sources",
  "articles",
  "personaHistory",
  "ctas",
  "newsArchive",
] as const;

const MIGRATION_SINGLETON_DOCS: ReadonlyArray<[string, string]> = [
  ["author", "profile"],
  ["audience", "profile"],
  ["persona", "current"],
  ["learning", "profile"],
  ["enrichment", "profile"],
  ["insights", "performance"],
];

async function copyLegacyWorkspaceToAccount(
  ownerId: string,
  accountId: string,
): Promise<void> {
  const db = getClientFirestore();
  if (!db) return;

  const batch = writeBatch(db);

  for (const [col, docId] of MIGRATION_SINGLETON_DOCS) {
    const legacy = await getDoc(legacyDocRef(ownerId, col, docId));
    if (!legacy.exists()) continue;
    const target = doc(
      db,
      ...(workspaceDocPathForAccount(ownerId, accountId, col, docId) as [
        string,
        ...string[],
      ]),
    );
    batch.set(target, legacy.data(), { merge: true });
  }

  for (const colName of MIGRATION_MULTI_COLLECTIONS) {
    const legacyCol = collection(db, ...(legacyDocPath(ownerId, colName) as [string, ...string[]]));
    const snap = await getDocs(legacyCol);
    for (const d of snap.docs) {
      const target = doc(
        db,
        ...(workspaceDocPathForAccount(ownerId, accountId, colName, d.id) as [
          string,
          ...string[],
        ]),
      );
      batch.set(target, d.data(), { merge: true });
    }
  }

  await batch.commit();
}

async function ensureDefaultAccount(
  ownerId: string,
  defaultName: string,
): Promise<WorkspaceAccount> {
  const existing = await getWorkspaceAccount(ownerId, DEFAULT_ACCOUNT_ID);
  if (existing) return existing;

  const now = serverTimestamp();
  await setDoc(accountRef(ownerId, DEFAULT_ACCOUNT_ID), {
    name: defaultName,
    contentLanguage: "fr",
    setupStep: "llm",
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  });

  const hasLegacy = await legacyAuthorExists(ownerId);
  const hasScoped = await scopedAuthorExists(ownerId, DEFAULT_ACCOUNT_ID);
  if (hasLegacy && !hasScoped) {
    await copyLegacyWorkspaceToAccount(ownerId, DEFAULT_ACCOUNT_ID);
  }

  const created = await getWorkspaceAccount(ownerId, DEFAULT_ACCOUNT_ID);
  if (!created) throw new Error("Failed to create default workspace account");
  return created;
}

export type WorkspaceBootstrapResult = {
  scope: WorkspaceScope;
  accounts: WorkspaceAccount[];
  isPlatformAdmin: boolean;
  canManageAccounts: boolean;
};

/** Ensures at least one account, picks active account, sets React scope. */
export async function bootstrapWorkspaceAccounts(
  ownerId: string,
  email: string,
  displayName?: string,
): Promise<WorkspaceBootstrapResult> {
  const isPlatformAdmin = isPlatformAdminEmail(email);
  const defaultName =
    displayName?.trim() ||
    email.split("@")[0]?.replace(/\./g, " ") ||
    "Mon compte";

  await ensureDefaultAccount(ownerId, defaultName);

  if (isPlatformAdmin) {
    const db = getClientFirestore();
    if (db) {
      await updateDoc(doc(db, "users", ownerId), {
        isPlatformAdmin: true,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
  }

  let accounts = await listWorkspaceAccounts(ownerId);
  if (accounts.length === 0) {
    await ensureDefaultAccount(ownerId, defaultName);
    accounts = await listWorkspaceAccounts(ownerId);
  }

  const storedId = readStoredActiveAccountId(ownerId);
  const userSnap = await getDoc(doc(getClientFirestore()!, "users", ownerId));
  const userActiveId = userSnap.exists()
    ? (userSnap.data().activeAccountId as string | undefined)
    : undefined;

  const preferredId =
    (storedId && accounts.some((a) => a.id === storedId) && storedId) ||
    (userActiveId && accounts.some((a) => a.id === userActiveId) && userActiveId) ||
    accounts.find((a) => a.isDefault)?.id ||
    accounts[0]?.id ||
    DEFAULT_ACCOUNT_ID;

  const scope: WorkspaceScope = { ownerId, accountId: preferredId };
  setActiveWorkspaceScope(scope);
  storeActiveAccountId(ownerId, preferredId);
  await setUserActiveAccountId(ownerId, preferredId).catch(() => {});

  return {
    scope,
    accounts,
    isPlatformAdmin,
    canManageAccounts: isPlatformAdmin,
  };
}

export async function switchWorkspaceAccount(
  ownerId: string,
  accountId: string,
): Promise<WorkspaceScope> {
  const account = await getWorkspaceAccount(ownerId, accountId);
  if (!account) throw new Error("Workspace account not found");
  const scope: WorkspaceScope = { ownerId, accountId };
  setActiveWorkspaceScope(scope);
  storeActiveAccountId(ownerId, accountId);
  await setUserActiveAccountId(ownerId, accountId);
  return scope;
}
