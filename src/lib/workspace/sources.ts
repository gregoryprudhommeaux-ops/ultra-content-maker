import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import type { SourceLink, SourceType } from "@/types/workspace";
import { getClientFirestore } from "@/lib/firebase/client";
import { toDate } from "./firestore-utils";

function sourcesCollection(userId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return collection(db, "users", userId, "sources");
}

export async function listSources(userId: string): Promise<SourceLink[]> {
  const q = query(sourcesCollection(userId), orderBy("sortOrder", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d, i) => {
    const data = d.data();
    return {
      id: d.id,
      type: data.type as SourceType,
      url: data.url as string,
      label: data.label as string | undefined,
      sortOrder: (data.sortOrder as number) ?? i,
      createdAt: toDate(data.createdAt),
    };
  });
}

export async function addSource(
  userId: string,
  input: { type: SourceType; url: string; label?: string },
): Promise<string> {
  const existing = await listSources(userId);
  const ref = await addDoc(sourcesCollection(userId), {
    type: input.type,
    url: input.url,
    label: input.label ?? null,
    sortOrder: existing.length,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function removeSource(userId: string, sourceId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  await deleteDoc(doc(db, "users", userId, "sources", sourceId));
}
