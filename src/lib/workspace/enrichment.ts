import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { GapAnswerValue, ProfileEnrichment } from "@/types/workspace";
import { getClientFirestore } from "@/lib/firebase/client";
import { toDate } from "./firestore-utils";

const DOC_ID = "profile";

function enrichmentRef(userId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return doc(db, "users", userId, "enrichment", DOC_ID);
}

export async function getProfileEnrichment(
  userId: string,
): Promise<ProfileEnrichment | null> {
  const snap = await getDoc(enrichmentRef(userId));
  if (!snap.exists()) return null;
  const d = snap.data();
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
  await setDoc(enrichmentRef(userId), {
    details: { ...(prev?.details ?? {}), ...details },
    updatedAt: serverTimestamp(),
  });
}
