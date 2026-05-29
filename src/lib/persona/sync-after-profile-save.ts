import type { ContentLanguage } from "@/types/workspace";

/** Merge learned preferences + profile into Persona after profile / sources change. */
export async function syncPersonaAfterProfileSave(userId: string): Promise<void> {
  try {
    const { syncPersonaFromFeedback } = await import(
      "@/lib/persona/sync-persona-from-feedback"
    );
    await syncPersonaFromFeedback(userId);
  } catch {
    /* Persona may not exist yet during early onboarding */
  }
}

/**
 * After author profile save: sync preferences, then LLM-refresh base prompt when possible.
 */
export async function syncPersonaAfterAuthorProfileSave(
  userId: string,
  contentLanguage: ContentLanguage,
): Promise<void> {
  try {
    const { getPersona } = await import("@/lib/workspace/persona");
    const persona = await getPersona(userId);
    if (!persona?.promptText?.trim()) {
      await syncPersonaAfterProfileSave(userId);
      return;
    }

    const { refreshPersonaFromProfile } = await import(
      "@/lib/persona/refresh-persona-from-profile"
    );
    const result = await refreshPersonaFromProfile(userId, contentLanguage);
    if (!result.ok) {
      await syncPersonaAfterProfileSave(userId);
    }
  } catch {
    await syncPersonaAfterProfileSave(userId);
  }
}
