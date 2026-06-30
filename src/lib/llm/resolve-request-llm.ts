import { getAdminFirestore } from "@/lib/firebase/admin";
import { configFromUserLlm, getLlmConfig, type LlmConfig } from "@/lib/llm/config";
import type { LinkedWorkspace, LlmProvider } from "@/types/workspace";

export type RequestLlmInput = {
  provider?: LlmProvider;
  apiKey?: string;
  model?: string;
};

async function readLlmFromFirestore(userId: string): Promise<LlmConfig | null> {
  const db = getAdminFirestore();
  if (!db) return null;

  const snap = await db.doc(`users/${userId}/llm/profile`).get();
  const data = snap.data();
  const storedKey = typeof data?.apiKey === "string" ? data.apiKey.trim() : "";
  if (!storedKey) return null;

  return configFromUserLlm({
    provider: (data?.provider as LlmProvider) ?? "openai",
    apiKey: storedKey,
    model: typeof data?.model === "string" ? data.model : undefined,
  });
}

async function readLinkedWorkspaceOwnerId(userId: string): Promise<string | null> {
  const db = getAdminFirestore();
  if (!db) return null;

  const snap = await db.doc(`users/${userId}`).get();
  if (!snap.exists) return null;

  const linked = snap.data()?.linkedWorkspace as LinkedWorkspace | undefined;
  const ownerId = linked?.ownerId?.trim();
  return ownerId && ownerId !== userId ? ownerId : null;
}

/**
 * Body key first, then the auth user's Firestore doc, then the linked workspace
 * owner's key (invited clients skip /setup/llm), then env fallback.
 */
export async function resolveRequestLlm(
  userId: string | null,
  bodyLlm?: RequestLlmInput,
): Promise<LlmConfig | null> {
  const bodyKey = bodyLlm?.apiKey?.trim() ?? "";
  if (bodyKey) {
    return configFromUserLlm({
      provider: bodyLlm?.provider ?? "openai",
      apiKey: bodyKey,
      model: bodyLlm?.model,
    });
  }

  if (userId) {
    const own = await readLlmFromFirestore(userId);
    if (own) return own;

    const ownerId = await readLinkedWorkspaceOwnerId(userId);
    if (ownerId) {
      const ownerLlm = await readLlmFromFirestore(ownerId);
      if (ownerLlm) return ownerLlm;
    }
  }

  return getLlmConfig();
}

/** Whether this user can call LLM routes (own key or linked workspace owner key). */
export async function userHasResolvableLlm(userId: string): Promise<boolean> {
  const llm = await resolveRequestLlm(userId);
  return llm !== null;
}
