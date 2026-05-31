import { serverTimestamp, setDoc } from "firebase/firestore";
import type { GapAnswerValue, ProfileEnrichment } from "@/types/workspace";
import { toDate } from "./firestore-utils";
import { readScopedOrLegacyDoc, workspaceDocRef } from "./workspace-scope";

const DOC_ID = "profile";

export async function getProfileEnrichment(
  userId: string,
): Promise<ProfileEnrichment | null> {
  const d = await readScopedOrLegacyDoc(userId, (x) => x, "enrichment", DOC_ID);
  if (!d) return null;
  return {
    details: (d.details as Record<string, GapAnswerValue>) ?? {},
    updatedAt: toDate(d.updatedAt),
  };
}

export async function saveProfileEnrichment(
  userId: string,
  details: Record<string, GapAnswerValue>,
) {
  const prev = await getProfileEnrichment(userId);
  await setDoc(workspaceDocRef(userId, "enrichment", DOC_ID), {
    details: { ...(prev?.details ?? {}), ...details },
    updatedAt: serverTimestamp(),
  });
  const { getAuthorProfile } = await import("@/lib/workspace/author");
  const author = await getAuthorProfile(userId);
  const { syncPersonaAfterProfileChange } = await import(
    "@/lib/persona/sync-after-profile-save"
  );
  await syncPersonaAfterProfileChange(userId, author?.contentLanguage);
}
