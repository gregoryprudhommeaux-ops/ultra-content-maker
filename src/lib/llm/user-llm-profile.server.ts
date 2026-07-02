import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import type { LlmProvider, UserLlmProfile } from "@/types/workspace";
import { isPlatformApiKey } from "./platform-key.server";
import { toDate } from "@/lib/workspace/firestore-utils";

function parseProfile(data: DocumentData | undefined): UserLlmProfile | null {
  if (!data) return null;
  const apiKey = typeof data.apiKey === "string" ? data.apiKey : "";
  const userProvided = data.userProvided === true;
  return {
    provider: (data.provider as LlmProvider) ?? "openai",
    apiKey,
    userProvided,
    model: typeof data.model === "string" ? data.model : undefined,
    configuredAt: toDate(data.configuredAt),
    updatedAt: toDate(data.updatedAt),
  };
}

/** User BYOK only — excludes platform env keys and legacy app-key copies. */
export function isUserProvidedLlmKey(profile: UserLlmProfile | null): boolean {
  if (!profile?.apiKey?.trim()) return false;
  if (profile.userProvided !== true) return false;
  return !isPlatformApiKey(profile.apiKey);
}

export async function readUserLlmProfileServer(
  userId: string,
): Promise<UserLlmProfile | null> {
  const db = getAdminFirestore();
  if (!db) return null;

  const ref = db.doc(`users/${userId}/llm/profile`);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const profile = parseProfile(snap.data());
  if (!profile) return null;

  const storedKey = profile.apiKey.trim();
  if (!storedKey) return profile;

  if (isPlatformApiKey(storedKey)) {
    await ref
      .set(
        {
          apiKey: FieldValue.delete(),
          userProvided: false,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      .catch(() => {});
    return { ...profile, apiKey: "", userProvided: false };
  }

  if (profile.userProvided !== true) {
    await ref
      .set({ userProvided: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
      .catch(() => {});
    return { ...profile, userProvided: true };
  }

  return profile;
}
