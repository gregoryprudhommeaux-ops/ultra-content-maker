import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import type { CreateClientInput, Client, OnboardingStatus } from "@/types/client";
import { getClientFirestore } from "@/lib/firebase/client";

function clientDoc(userId: string, clientId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return doc(db, "users", userId, "clients", clientId);
}

function clientsCollection(userId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return collection(db, "users", userId, "clients");
}

function mapClient(id: string, data: Record<string, unknown>): Client {
  const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
  const updatedAt = data.updatedAt as { toDate?: () => Date } | undefined;
  return {
    id,
    name: data.name as string,
    clientTypeLabel: data.clientTypeLabel as string,
    contentLanguage: data.contentLanguage as Client["contentLanguage"],
    sector: data.sector as string | undefined,
    notes: data.notes as string | undefined,
    onboardingStatus: data.onboardingStatus as Client["onboardingStatus"],
    brainStatus: data.brainStatus as Client["brainStatus"],
    createdAt: createdAt?.toDate?.() ?? new Date(),
    updatedAt: updatedAt?.toDate?.() ?? new Date(),
  };
}

export async function listClients(userId: string): Promise<Client[]> {
  const q = query(clientsCollection(userId), orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapClient(d.id, d.data()));
}

export async function getClient(
  userId: string,
  clientId: string,
): Promise<Client | null> {
  const snap = await getDoc(clientDoc(userId, clientId));
  if (!snap.exists()) return null;
  return mapClient(snap.id, snap.data());
}

export async function createClient(
  userId: string,
  input: CreateClientInput,
): Promise<string> {
  const ref = await addDoc(clientsCollection(userId), {
    ...input,
    onboardingStatus: "not_started",
    brainStatus: "none",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateClientOnboardingStatus(
  userId: string,
  clientId: string,
  status: OnboardingStatus,
) {
  await updateDoc(clientDoc(userId, clientId), {
    onboardingStatus: status,
    updatedAt: serverTimestamp(),
  });
}

export async function updateClientContentLanguage(
  userId: string,
  clientId: string,
  contentLanguage: Client["contentLanguage"],
) {
  await updateDoc(clientDoc(userId, clientId), {
    contentLanguage,
    updatedAt: serverTimestamp(),
  });
}

export async function touchClient(userId: string, clientId: string) {
  await updateDoc(clientDoc(userId, clientId), {
    updatedAt: serverTimestamp(),
  });
}
