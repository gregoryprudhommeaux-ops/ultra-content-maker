import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getClientFirestore } from "@/lib/firebase/client";
import { defaultSubscriptionProfile, normalizeSubscriptionProfile } from "./access";
import type { SubscriptionProfile } from "@/types/subscription";

function userRef(userId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return doc(db, "users", userId);
}

export async function getSubscriptionProfileClient(userId: string): Promise<SubscriptionProfile> {
  const snap = await getDoc(userRef(userId));
  if (!snap.exists()) return defaultSubscriptionProfile();
  return normalizeSubscriptionProfile(snap.data().subscription);
}

export function subscribeSubscriptionProfile(
  userId: string,
  onChange: (profile: SubscriptionProfile) => void,
): () => void {
  const db = getClientFirestore();
  if (!db) return () => {};
  return onSnapshot(userRef(userId), (snap) => {
    if (!snap.exists()) {
      onChange(defaultSubscriptionProfile());
      return;
    }
    onChange(normalizeSubscriptionProfile(snap.data().subscription));
  });
}

export async function ensureSubscriptionTrialClient(userId: string): Promise<void> {
  const snap = await getDoc(userRef(userId));
  if (!snap.exists()) return;
  const data = snap.data();
  if (data.subscription) return;
  await updateDoc(userRef(userId), {
    subscription: defaultSubscriptionProfile(),
    updatedAt: serverTimestamp(),
  }).catch(() =>
    setDoc(
      userRef(userId),
      { subscription: defaultSubscriptionProfile(), updatedAt: serverTimestamp() },
      { merge: true },
    ),
  );
}
