import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { PersonaDoc, PersonaStatus, ProfileGapQuestion } from "@/types/workspace";
import { getClientFirestore } from "@/lib/firebase/client";
import { toDate } from "./firestore-utils";

const CURRENT_ID = "current";

function personaRef(userId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return doc(db, "users", userId, "persona", CURRENT_ID);
}

export async function getPersona(userId: string): Promise<PersonaDoc | null> {
  const snap = await getDoc(personaRef(userId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    promptText: (d.promptText as string) ?? "",
    status: (d.status as PersonaStatus) ?? "none",
    model: d.model as string | undefined,
    gapQuestions: Array.isArray(d.gapQuestions)
      ? (d.gapQuestions as ProfileGapQuestion[])
      : undefined,
    validatedAt: d.validatedAt ? toDate(d.validatedAt) : undefined,
    updatedAt: toDate(d.updatedAt),
  };
}

export async function savePersonaDraft(
  userId: string,
  promptText: string,
  model?: string,
  gapQuestions?: ProfileGapQuestion[],
) {
  await setDoc(
    personaRef(userId),
    {
      promptText,
      status: "draft",
      model: model ?? null,
      gapQuestions: gapQuestions ?? null,
      validatedAt: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** Update prompt text only — keeps validated/draft status (for learned-preferences merge). */
export async function updatePersonaPromptText(userId: string, promptText: string) {
  await setDoc(
    personaRef(userId),
    { promptText, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function validatePersona(userId: string, promptText: string) {
  const prev = await getPersona(userId);
  await setDoc(
    personaRef(userId),
    {
      promptText,
      status: "validated",
      gapQuestions: prev?.gapQuestions ?? null,
      validatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
