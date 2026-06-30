import { getAdminFirestore } from "@/lib/firebase/admin";
import { configFromUserLlm, getLlmConfig, type LlmConfig } from "@/lib/llm/config";
import type { LlmProvider } from "@/types/workspace";

export type RequestLlmInput = {
  provider?: LlmProvider;
  apiKey?: string;
  model?: string;
};

/** Body key first, then Firestore (server), then env fallback. */
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
    const db = getAdminFirestore();
    if (db) {
      const snap = await db.doc(`users/${userId}/llm/profile`).get();
      const data = snap.data();
      const storedKey = typeof data?.apiKey === "string" ? data.apiKey.trim() : "";
      if (storedKey) {
        return configFromUserLlm({
          provider: (data?.provider as LlmProvider) ?? "openai",
          apiKey: storedKey,
          model: typeof data?.model === "string" ? data.model : undefined,
        });
      }
    }
  }

  return getLlmConfig();
}
