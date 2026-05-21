import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { LlmProvider, UserLlmProfile } from "@/types/workspace";
import { getClientFirestore } from "@/lib/firebase/client";
import { toDate } from "./firestore-utils";

const DOC_ID = "profile";

function llmRef(userId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return doc(db, "users", userId, "llm", DOC_ID);
}

export async function getUserLlmProfile(userId: string): Promise<UserLlmProfile | null> {
  const snap = await getDoc(llmRef(userId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    provider: d.provider as LlmProvider,
    apiKey: d.apiKey as string,
    model: d.model as string | undefined,
    configuredAt: toDate(d.configuredAt),
    updatedAt: toDate(d.updatedAt),
  };
}

export async function saveUserLlmProfile(
  userId: string,
  input: { provider: LlmProvider; apiKey: string; model?: string },
) {
  await setDoc(llmRef(userId), {
    provider: input.provider,
    apiKey: input.apiKey.trim(),
    model: input.model?.trim() || null,
    configuredAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export { defaultModelForProvider } from "@/lib/llm/providers";
