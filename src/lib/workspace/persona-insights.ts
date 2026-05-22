import { doc, getDoc, setDoc, serverTimestamp, type DocumentData } from "firebase/firestore";
import type { PersonaPerformanceInsights } from "@/types/workspace";
import { getClientFirestore } from "@/lib/firebase/client";
import { toDate } from "./firestore-utils";

function insightsRef(userId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return doc(db, "users", userId, "insights", "performance");
}

function mapInsights(d: DocumentData): PersonaPerformanceInsights {
  return {
    summary: (d.summary as string) ?? "",
    suggestions: Array.isArray(d.suggestions) ? (d.suggestions as string[]) : [],
    generatedAt: toDate(d.generatedAt),
    postsAnalyzed: typeof d.postsAnalyzed === "number" ? d.postsAnalyzed : 0,
  };
}

export async function getPersonaPerformanceInsights(
  userId: string,
): Promise<PersonaPerformanceInsights | null> {
  const snap = await getDoc(insightsRef(userId));
  if (!snap.exists()) return null;
  return mapInsights(snap.data());
}

export async function savePersonaPerformanceInsights(
  userId: string,
  data: Omit<PersonaPerformanceInsights, "generatedAt"> & { generatedAt?: Date },
) {
  await setDoc(
    insightsRef(userId),
    {
      summary: data.summary,
      suggestions: data.suggestions,
      postsAnalyzed: data.postsAnalyzed,
      generatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
