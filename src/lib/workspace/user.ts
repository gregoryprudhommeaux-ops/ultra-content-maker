import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import type { SetupStep, UserDoc } from "@/types/workspace";
import { getClientFirestore } from "@/lib/firebase/client";
import { isPlatformAdminEmail } from "./platform-admin";
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
    isPlatformAdmin: Boolean(d.isPlatformAdmin),
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  };
}

export async function ensureUserDoc(
  userId: string,
  email: string,
  displayName?: string,
): Promise<UserDoc> {
  const existing = await getUserDoc(userId);
  if (existing) return existing;
  const now = serverTimestamp();
  const isPlatformAdmin = isPlatformAdminEmail(email);
  await setDoc(userRef(userId), {
    email,
    displayName: displayName ?? null,
    setupStep: "llm",
    isPlatformAdmin,
    createdAt: now,
    updatedAt: now,
  });
  return {
    email,
    displayName,
    setupStep: "llm",
    isPlatformAdmin,
    createdAt: new Date(),
    updatedAt: new Date(),
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
