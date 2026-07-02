import { serverTimestamp, setDoc } from "firebase/firestore";
import type { AudienceProfile } from "@/types/workspace";
import { toDate } from "./firestore-utils";
import { readScopedOrLegacyDoc, workspaceDocRef } from "./workspace-scope";

const DOC_ID = "profile";

export async function getAudienceProfile(userId: string): Promise<AudienceProfile | null> {
  const d = await readScopedOrLegacyDoc(userId, (x) => x, "audience", DOC_ID);
  if (!d) return null;
  return {
    targetLabel: d.targetLabel as string | undefined,
    contentFocus: d.contentFocus as string | undefined,
    contentNiche: d.contentNiche as string | undefined,
    newsInterestQuery: d.newsInterestQuery as string | undefined,
    optionalNotes: d.optionalNotes as string | undefined,
    skipped: d.skipped as boolean | undefined,
    updatedAt: toDate(d.updatedAt),
  };
}

export async function saveAudienceProfile(
  userId: string,
  input: Partial<Omit<AudienceProfile, "updatedAt">> & { skipped?: boolean },
) {
  await setDoc(
    workspaceDocRef(userId, "audience", DOC_ID),
    {
      targetLabel: input.targetLabel ?? null,
      contentFocus: input.contentFocus ?? null,
      contentNiche: input.contentNiche ?? null,
      newsInterestQuery: input.newsInterestQuery ?? null,
      optionalNotes: input.optionalNotes ?? null,
      skipped: input.skipped ?? false,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  const { getAuthorProfile } = await import("@/lib/workspace/author");
  const author = await getAuthorProfile(userId);
  const { syncPersonaAfterProfileChange } = await import(
    "@/lib/persona/sync-after-profile-save"
  );
  await syncPersonaAfterProfileChange(userId, author?.contentLanguage);
}

export async function skipAudienceStep(userId: string) {
  await saveAudienceProfile(userId, { skipped: true });
}
