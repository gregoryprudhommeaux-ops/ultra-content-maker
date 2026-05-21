import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getClientFirestore } from "@/lib/firebase/client";
import type { OnboardingStepNumber, OnboardingStepPayload } from "@/types/onboarding";

function stepDoc(userId: string, clientId: string, step: OnboardingStepNumber) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return doc(db, "users", userId, "clients", clientId, "onboarding", String(step));
}

export async function saveOnboardingStep(
  userId: string,
  clientId: string,
  step: OnboardingStepNumber,
  payload: OnboardingStepPayload,
) {
  await setDoc(
    stepDoc(userId, clientId, step),
    {
      step,
      payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function loadOnboardingStep<T extends OnboardingStepPayload>(
  userId: string,
  clientId: string,
  step: OnboardingStepNumber,
): Promise<T | null> {
  const snap = await getDoc(stepDoc(userId, clientId, step));
  if (!snap.exists()) return null;
  return snap.data().payload as T;
}

export async function loadAllOnboardingSteps(
  userId: string,
  clientId: string,
): Promise<Partial<Record<OnboardingStepNumber, OnboardingStepPayload>>> {
  const result: Partial<Record<OnboardingStepNumber, OnboardingStepPayload>> = {};
  for (let s = 1; s <= 5; s++) {
    const step = s as OnboardingStepNumber;
    const data = await loadOnboardingStep(userId, clientId, step);
    if (data) result[step] = data;
  }
  return result;
}
