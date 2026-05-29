import type { ContentLanguage } from "@/types/workspace";

/** Merge learned preferences into Persona (no LLM). */
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
 * After any profile save (author, audience, enrichment, sources):
 * sync learned section, then LLM-refresh the base Persona when one exists.
 */
export async function syncPersonaAfterProfileChange(
  userId: string,
  contentLanguage?: ContentLanguage,
): Promise<void> {
  try {
    const { getPersona } = await import("@/lib/workspace/persona");
    const { getAuthorProfile } = await import("@/lib/workspace/author");
    const persona = await getPersona(userId);

    if (!persona?.promptText?.trim()) {
      await syncPersonaAfterProfileSave(userId);
      return;
    }

    const author = await getAuthorProfile(userId);
    const lang = (contentLanguage ?? author?.contentLanguage ?? "fr") as ContentLanguage;
    const { refreshPersonaFromProfile } = await import(
      "@/lib/persona/refresh-persona-from-profile"
    );
    const result = await refreshPersonaFromProfile(userId, lang);
    if (!result.ok) {
      await syncPersonaAfterProfileSave(userId);
    }
  } catch {
    await syncPersonaAfterProfileSave(userId);
  }
}

/** @deprecated Use syncPersonaAfterProfileChange */
export const syncPersonaAfterAuthorProfileSave = syncPersonaAfterProfileChange;
