import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { defaultSubscriptionProfile } from "@/lib/subscription/access";
import type { SetupStep, UserDoc } from "@/types/workspace";
import { getClientFirestore } from "@/lib/firebase/client";
import { isPlatformAdminIdentity } from "./platform-admin";
import {
  getActiveWorkspaceScope,
  requireWorkspaceScope,
} from "./workspace-scope";
import { updateAccountSetupStep } from "./accounts";
import { toDate } from "./firestore-utils";

function userRef(userId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return doc(db, "users", userId);
}

export async function getUserDoc(userId: string): Promise<UserDoc | null> {
  const snap = await getDoc(userRef(userId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    email: d.email as string,
    displayName: d.displayName as string | undefined,
    preferredLocale: d.preferredLocale as UserDoc["preferredLocale"],
    setupStep: (d.setupStep as SetupStep) ?? "llm",
    activeAccountId: d.activeAccountId as string | undefined,
    linkedWorkspace: d.linkedWorkspace as UserDoc["linkedWorkspace"],
    managedClients: d.managedClients as UserDoc["managedClients"],
    managedBy: d.managedBy as UserDoc["managedBy"],
    isPlatformAdmin: Boolean(d.isPlatformAdmin),
    subscription: d.subscription as UserDoc["subscription"],
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  };
}

export type EnsureUserDocResult = {
  doc: UserDoc;
  isNewUser: boolean;
};

export async function ensureUserDoc(
  userId: string,
  email: string,
  displayName?: string,
): Promise<EnsureUserDocResult> {
  const existing = await getUserDoc(userId);
  if (existing) return { doc: existing, isNewUser: false };
  const now = serverTimestamp();
  const isPlatformAdmin = isPlatformAdminIdentity({ uid: userId, email });
  const subscription = defaultSubscriptionProfile();
  await setDoc(userRef(userId), {
    email,
    displayName: displayName ?? null,
    setupStep: "llm",
    isPlatformAdmin,
    subscription,
    createdAt: now,
    updatedAt: now,
  });
  return {
    doc: {
      email,
      displayName,
      setupStep: "llm",
      isPlatformAdmin,
      subscription,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    isNewUser: true,
  };
}

export async function updateSetupStep(userId: string, setupStep: SetupStep) {
  const scope = getActiveWorkspaceScope() ?? requireWorkspaceScope(userId);
  await updateAccountSetupStep(scope.ownerId, scope.accountId, setupStep);
  await updateDoc(userRef(userId), { setupStep, updatedAt: serverTimestamp() }).catch(
    () => {},
  );
}

export function setupStepToPath(step: SetupStep): string {
  switch (step) {
    case "llm":
      return "/setup/llm";
    case "express":
      return "/setup/express";
    case "author":
      return "/setup/author";
    case "audience":
      return "/setup/audience";
    case "persona":
      return "/persona";
    case "articles":
    case "ready":
      return "/articles";
    default:
      return "/setup/llm";
  }
}
