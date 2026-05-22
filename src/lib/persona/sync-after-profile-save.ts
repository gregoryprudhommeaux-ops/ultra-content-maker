/** Fire-and-forget Persona merge after profile / sources change (avoids import cycles). */
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
