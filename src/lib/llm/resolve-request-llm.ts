import { getAdminFirestore } from "@/lib/firebase/admin";
import { configFromUserLlm, getPlatformLlmConfig, type LlmConfig } from "@/lib/llm/config";
import { isPlatformApiKey } from "@/lib/llm/platform-key.server";
import { readUserLlmProfileServer } from "@/lib/llm/user-llm-profile.server";
import { resolveSubscriptionAccess } from "@/lib/subscription/access";
import { userApiKeyAllowedForTier } from "@/lib/subscription/constants";
import { getSubscriptionProfileServer } from "@/lib/subscription/subscription.server";
import type { LinkedWorkspace, LlmProvider } from "@/types/workspace";

export type RequestLlmInput = {
  provider?: LlmProvider;
  apiKey?: string;
  model?: string;
};

async function readLlmFromFirestore(userId: string): Promise<LlmConfig | null> {
  const profile = await readUserLlmProfileServer(userId);
  const storedKey = profile?.apiKey?.trim() ?? "";
  if (!storedKey || isPlatformApiKey(storedKey)) return null;

  return configFromUserLlm({
    provider: profile!.provider ?? "openai",
    apiKey: storedKey,
    model: profile?.model,
  });
}

async function readManagedByAdminId(userId: string): Promise<string | null> {
  const db = getAdminFirestore();
  if (!db) return null;

  const snap = await db.doc(`users/${userId}`).get();
  if (!snap.exists) return null;

  const managedBy = snap.data()?.managedBy as { adminUid?: string } | undefined;
  const adminUid = managedBy?.adminUid?.trim();
  return adminUid && adminUid !== userId ? adminUid : null;
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
  let byokAllowed = true;
  if (userId) {
    const access = resolveSubscriptionAccess(await getSubscriptionProfileServer(userId));
    byokAllowed = userApiKeyAllowedForTier(access.effectiveTier);
  }

  if (byokAllowed && bodyKey && !isPlatformApiKey(bodyKey)) {
    return configFromUserLlm({
      provider: bodyLlm?.provider ?? "openai",
      apiKey: bodyKey,
      model: bodyLlm?.model,
    });
  }

  if (userId) {
    const own = await readLlmFromFirestore(userId);
    if (own && byokAllowed) return own;

    const ownerId = await readLinkedWorkspaceOwnerId(userId);
    if (ownerId) {
      const ownerLlm = await readLlmFromFirestore(ownerId);
      if (ownerLlm) return ownerLlm;
    }

    const adminUid = await readManagedByAdminId(userId);
    if (adminUid) {
      const adminLlm = await readLlmFromFirestore(adminUid);
      if (adminLlm) return adminLlm;
    }

    const profile = await getSubscriptionProfileServer(userId);
    if (profile.tier === "full_free" && profile.fullFreeGrantedByAdminUid) {
      const grantAdminLlm = await readLlmFromFirestore(profile.fullFreeGrantedByAdminUid);
      if (grantAdminLlm) return grantAdminLlm;
    }

    const access = resolveSubscriptionAccess(profile);
    if (access.canUseOwnLlmOnly) {
      return null;
    }
    if (access.canUsePlatformLlm || profile.tier === "full_free") {
      const platform = getPlatformLlmConfig();
      if (platform) return platform;
    }
    return null;
  }

  return getPlatformLlmConfig();
}

/** User's own Firestore key only (not linked owner, not platform). */
export async function resolveOwnUserLlm(userId: string): Promise<LlmConfig | null> {
  return readLlmFromFirestore(userId);
}

/** Whether this user can call LLM routes (own key or linked workspace owner key). */
export async function userHasResolvableLlm(userId: string): Promise<boolean> {
  const llm = await resolveRequestLlm(userId);
  return llm !== null;
}
