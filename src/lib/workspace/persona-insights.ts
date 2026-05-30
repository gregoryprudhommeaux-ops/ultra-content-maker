import { setDoc, serverTimestamp, type DocumentData } from "firebase/firestore";
import type { PersonaPerformanceInsights } from "@/types/workspace";
import { toDate } from "./firestore-utils";
import { readScopedOrLegacyDoc, workspaceDocRef } from "./workspace-scope";

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
  const d = await readScopedOrLegacyDoc(userId, (x) => x, "insights", "performance");
  if (!d) return null;
  return mapInsights(d);
}

export async function savePersonaPerformanceInsights(
  userId: string,
  data: Omit<PersonaPerformanceInsights, "generatedAt"> & { generatedAt?: Date },
) {
  await setDoc(
    workspaceDocRef(userId, "insights", "performance"),
    {
      summary: data.summary,
      suggestions: data.suggestions,
      postsAnalyzed: data.postsAnalyzed,
      generatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
