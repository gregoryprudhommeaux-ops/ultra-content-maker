import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import type {
  PersonaHistoryEntry,
  PersonaHistoryReason,
  PersonaStatus,
  ProfileGapQuestion,
} from "@/types/workspace";
import { getClientFirestore } from "@/lib/firebase/client";
import { toDate } from "./firestore-utils";

/** Max versions shown and kept (most recent updates). */
export const PERSONA_HISTORY_LIST_MAX = 10;

/** Drop archived versions older than this (3 months). */
const PERSONA_HISTORY_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export function personaHistoryCutoffDate(): Date {
  return new Date(Date.now() - PERSONA_HISTORY_RETENTION_MS);
}

function historyCollection(userId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return collection(db, "users", userId, "personaHistory");
}

function mapHistoryDoc(
  id: string,
  data: Record<string, unknown>,
): PersonaHistoryEntry {
  return {
    id,
    promptText: (data.promptText as string) ?? "",
    status: (data.status as PersonaStatus) ?? "draft",
    model: (data.model as string) || undefined,
    gapQuestions: Array.isArray(data.gapQuestions)
      ? (data.gapQuestions as ProfileGapQuestion[])
      : undefined,
    reason: (data.reason as PersonaHistoryReason) ?? "feedback_sync",
    createdAt: toDate(data.createdAt),
  };
}

function isWithinRetention(createdAt: Date): boolean {
  return createdAt.getTime() >= personaHistoryCutoffDate().getTime();
}

/** Keep at most 10 newest entries; delete anything older than 3 months. */
async function prunePersonaHistory(userId: string) {
  const q = query(historyCollection(userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const toDelete = snap.docs.filter((d, index) => {
    const createdAt = toDate(d.data().createdAt);
    return index >= PERSONA_HISTORY_LIST_MAX || !isWithinRetention(createdAt);
  });
  if (toDelete.length === 0) return;
  await Promise.all(toDelete.map((d) => deleteDoc(d.ref)));
}

/** Save a snapshot of the current Persona prompt (before it is overwritten). */
export async function appendPersonaHistory(
  userId: string,
  entry: {
    promptText: string;
    status: PersonaStatus;
    model?: string;
    gapQuestions?: ProfileGapQuestion[];
    reason: PersonaHistoryReason;
  },
) {
  if (!entry.promptText.trim()) return;
  await addDoc(historyCollection(userId), {
    promptText: entry.promptText,
    status: entry.status,
    model: entry.model ?? null,
    gapQuestions: entry.gapQuestions ?? null,
    reason: entry.reason,
    createdAt: serverTimestamp(),
  });
  await prunePersonaHistory(userId);
}

export async function listPersonaHistory(
  userId: string,
): Promise<PersonaHistoryEntry[]> {
  const q = query(
    historyCollection(userId),
    orderBy("createdAt", "desc"),
    limit(PERSONA_HISTORY_LIST_MAX),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => mapHistoryDoc(d.id, d.data() as Record<string, unknown>))
    .filter((e) => isWithinRetention(e.createdAt));
}

export async function getPersonaHistoryEntry(
  userId: string,
  historyId: string,
): Promise<PersonaHistoryEntry | null> {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  const snap = await getDoc(doc(db, "users", userId, "personaHistory", historyId));
  if (!snap.exists()) return null;
  const entry = mapHistoryDoc(snap.id, snap.data() as Record<string, unknown>);
  if (!isWithinRetention(entry.createdAt)) return null;
  const visible = await listPersonaHistory(userId);
  if (!visible.some((e) => e.id === historyId)) return null;
  return entry;
}
