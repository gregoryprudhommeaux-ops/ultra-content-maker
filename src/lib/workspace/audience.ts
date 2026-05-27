import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { AudienceProfile } from "@/types/workspace";
import { getClientFirestore } from "@/lib/firebase/client";
import { toDate } from "./firestore-utils";

const DOC_ID = "profile";

function audienceRef(userId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return doc(db, "users", userId, "audience", DOC_ID);
}

export async function getAudienceProfile(userId: string): Promise<AudienceProfile | null> {
  const snap = await getDoc(audienceRef(userId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    targetLabel: d.targetLabel as string | undefined,
    contentFocus: d.contentFocus as string | undefined,
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
    audienceRef(userId),
    {
      targetLabel: input.targetLabel ?? null,
      contentFocus: input.contentFocus ?? null,
      newsInterestQuery: input.newsInterestQuery ?? null,
      optionalNotes: input.optionalNotes ?? null,
      skipped: input.skipped ?? false,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  const { syncPersonaAfterProfileSave } = await import(
    "@/lib/persona/sync-after-profile-save"
  );
  await syncPersonaAfterProfileSave(userId);
}

export async function skipAudienceStep(userId: string) {
  await saveAudienceProfile(userId, { skipped: true });
}
