import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import type { ContentLanguage, SetupStep } from "@/types/workspace";
import { getClientFirestore } from "@/lib/firebase/client";
import { isPlatformAdminIdentity } from "./platform-admin";
import { getUserDoc } from "./user";
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
import {
  managedAccountId,
  parseManagedAccountId,
} from "./managed-clients";
import type { ManagedClientEntry } from "@/types/workspace";
import { formatDisplayNameFromEmail } from "./display-name";
import { getClientAuth } from "@/lib/firebase/client";

type ManagedWorkspaceAccountResponse = Omit<
  WorkspaceAccount,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceAccount = {
  id: string;
  name: string;
  contentLanguage: ContentLanguage;
  setupStep: SetupStep;
  isDefault?: boolean;
  /** Client-owned workspace surfaced in admin switcher. */
  isManaged?: boolean;
  managedClientUid?: string;
  managedClientEmail?: string;
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

/** Maps switcher id (incl. managed:…) to Firestore workspace scope. */
export function resolveWorkspaceScope(
  sessionOwnerId: string,
  accountId: string,
): WorkspaceScope {
  const parsed = parseManagedAccountId(accountId);
  if (parsed) {
    return { ownerId: parsed.clientUid, accountId: parsed.accountId };
  }
  return { ownerId: sessionOwnerId, accountId };
}

export function resolveActiveAccountFromBootstrap(
  sessionOwnerId: string,
  accounts: WorkspaceAccount[],
  scope: WorkspaceScope,
): WorkspaceAccount | null {
  const storedId = readStoredActiveAccountId(sessionOwnerId);
  if (storedId) {
    const byStored = accounts.find((a) => a.id === storedId);
    if (byStored) return byStored;
  }
  return (
    accounts.find((a) => {
      if (a.isManaged) {
        const parsed = parseManagedAccountId(a.id);
        return (
          parsed?.clientUid === scope.ownerId &&
          parsed.accountId === scope.accountId
        );
      }
      return scope.ownerId === sessionOwnerId && a.id === scope.accountId;
    }) ??
    accounts[0] ??
    null
  );
}

export async function listWorkspaceAccounts(ownerId: string): Promise<WorkspaceAccount[]> {
  const snap = await getDocs(accountsCollection(ownerId));
  return snap.docs
    .map((d) => mapAccount(d.id, d.data()))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function getWorkspaceAccount(
  ownerId: string,
  accountId: string,
): Promise<WorkspaceAccount | null> {
  const parsed = parseManagedAccountId(accountId);
  if (parsed) {
    return getWorkspaceAccount(parsed.clientUid, parsed.accountId);
  }
  const snap = await getDoc(accountRef(ownerId, accountId));
  if (!snap.exists()) return null;
  return mapAccount(snap.id, snap.data());
}

async function fetchManagedAccountsFromApi(): Promise<WorkspaceAccount[]> {
  try {
    const auth = getClientAuth();
    const token = await auth?.currentUser?.getIdToken();
    if (!token) return [];

    const res = await fetch("/api/admin/managed-clients", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];

    const data = (await res.json()) as { accounts?: ManagedWorkspaceAccountResponse[] };
    return (data.accounts ?? []).map((account) => ({
      ...account,
      createdAt: new Date(account.createdAt),
      updatedAt: new Date(account.updatedAt),
    }));
  } catch {
    return [];
  }
}

async function loadManagedClientAccounts(
  adminUid: string,
  entries: ManagedClientEntry[],
): Promise<WorkspaceAccount[]> {
  const results = await Promise.all(
    entries.map(async (entry) => {
      const clientAccountId = entry.accountId || DEFAULT_ACCOUNT_ID;
      const ref = accountRef(entry.clientUid, clientAccountId);
      let snap;
      try {
        snap = await getDocFromServer(ref);
      } catch {
        snap = await getDoc(ref);
      }
      const accountData = snap.exists() ? snap.data() : null;
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
        isManaged: true,
        managedClientUid: entry.clientUid,
        managedClientEmail: entry.email,
        createdAt: accountData ? toDate(accountData.createdAt) : new Date(),
        updatedAt: accountData ? toDate(accountData.updatedAt) : new Date(),
      } satisfies WorkspaceAccount;
    }),
  );
  return results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
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
  "bioDocuments",
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
    try {
      await copyLegacyWorkspaceToAccount(ownerId, DEFAULT_ACCOUNT_ID);
    } catch {
      /* legacy fallback reads still work at root paths */
    }
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
  const isPlatformAdmin = isPlatformAdminIdentity({ uid: ownerId, email });

  try {
    const userDoc = await getUserDoc(ownerId);
    if (userDoc?.linkedWorkspace && !isPlatformAdmin) {
      const { ownerId: workspaceOwnerId, accountId } = userDoc.linkedWorkspace;
      const account = await getWorkspaceAccount(workspaceOwnerId, accountId);
      const scope: WorkspaceScope = { ownerId: workspaceOwnerId, accountId };
      setActiveWorkspaceScope(scope);
      storeActiveAccountId(workspaceOwnerId, accountId);
      return {
        scope,
        accounts: account ? [account] : [],
        isPlatformAdmin: false,
        canManageAccounts: false,
      };
    }
  } catch {
    /* fall through to owner bootstrap */
  }

  const defaultName = isPlatformAdmin
    ? formatDisplayNameFromEmail(email) ||
      displayName?.trim() ||
      email.split("@")[0]?.replace(/\./g, " ") ||
      "Mon compte"
    : displayName?.trim() ||
      email.split("@")[0]?.replace(/\./g, " ") ||
      "Mon compte";

  try {
    await ensureDefaultAccount(ownerId, defaultName);
  } catch {
    /* continue with default scope below */
  }

  if (isPlatformAdmin) {
    const db = getClientFirestore();
    if (db) {
      await updateDoc(doc(db, "users", ownerId), {
        isPlatformAdmin: true,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
  }

  let accounts: WorkspaceAccount[] = [];
  try {
    accounts = await listWorkspaceAccounts(ownerId);
  } catch {
    accounts = [];
  }

  if (isPlatformAdmin) {
    accounts = accounts.filter((account) => account.isDefault || account.id === DEFAULT_ACCOUNT_ID);
    let managedAccounts = await fetchManagedAccountsFromApi();
    if (managedAccounts.length === 0) {
      try {
        const userDoc = await getUserDoc(ownerId);
        const managedEntries = userDoc?.managedClients ?? [];
        if (managedEntries.length > 0) {
          managedAccounts = await loadManagedClientAccounts(ownerId, managedEntries);
        }
      } catch {
        /* managed clients optional */
      }
    }
    if (managedAccounts.length > 0) {
      accounts = [...managedAccounts, ...accounts];
    }
  }

  if (accounts.length === 0) {
    try {
      await ensureDefaultAccount(ownerId, defaultName);
      accounts = await listWorkspaceAccounts(ownerId);
    } catch {
      accounts = [];
    }
  }

  const storedId = readStoredActiveAccountId(ownerId);
  let userActiveId: string | undefined;
  try {
    const db = getClientFirestore();
    if (db) {
      const userSnap = await getDoc(doc(db, "users", ownerId));
      userActiveId = userSnap.exists()
        ? (userSnap.data().activeAccountId as string | undefined)
        : undefined;
    }
  } catch {
    userActiveId = undefined;
  }

  const preferredId =
    (storedId && accounts.some((a) => a.id === storedId) && storedId) ||
    (userActiveId && accounts.some((a) => a.id === userActiveId) && userActiveId) ||
    accounts.find((a) => a.isDefault)?.id ||
    accounts[0]?.id ||
    DEFAULT_ACCOUNT_ID;

  const scope = resolveWorkspaceScope(ownerId, preferredId);
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
  const parsed = parseManagedAccountId(accountId);
  if (parsed) {
    const account = await getWorkspaceAccount(parsed.clientUid, parsed.accountId).catch(
      () => null,
    );
    if (!account) {
      /* Agency manager may switch scope even if client account doc is not yet readable. */
    }
    const scope: WorkspaceScope = {
      ownerId: parsed.clientUid,
      accountId: parsed.accountId,
    };
    setActiveWorkspaceScope(scope);
    storeActiveAccountId(ownerId, accountId);
    await setUserActiveAccountId(ownerId, accountId);
    return scope;
  }

  const account = await getWorkspaceAccount(ownerId, accountId);
  if (!account) throw new Error("Workspace account not found");
  const scope: WorkspaceScope = { ownerId, accountId };
  setActiveWorkspaceScope(scope);
  storeActiveAccountId(ownerId, accountId);
  await setUserActiveAccountId(ownerId, accountId);
  return scope;
}
