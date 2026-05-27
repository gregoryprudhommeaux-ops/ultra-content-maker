import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import { stableNewsId } from "@/lib/news/stable-id";
import type { NewsSuggestion } from "@/types/workspace";
import { getClientFirestore } from "@/lib/firebase/client";
import { toDate } from "./firestore-utils";

export type ArchivedNewsDoc = NewsSuggestion & {
  archivedAt: Date;
  lastFetchedAt: Date;
};

/** Max items shown on the previous-news archive page. */
export const ARCHIVED_NEWS_DISPLAY_LIMIT = 10;

function newsArchiveCollection(userId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return collection(db, "users", userId, "newsArchive");
}

function mapArchived(id: string, d: DocumentData): ArchivedNewsDoc {
  return {
    id,
    title: (d.title as string) ?? "",
    summary: (d.summary as string) ?? "",
    url: (d.url as string) ?? "",
    publishedAt: (d.publishedAt as string) ?? "",
    sourceName: d.sourceName as string | undefined,
    archivedAt: toDate(d.archivedAt),
    lastFetchedAt: toDate(d.lastFetchedAt),
  };
}

/** Persist suggestions from a fetch so they can be reused without new LLM calls. */
export async function upsertNewsArchiveBatch(
  userId: string,
  items: NewsSuggestion[],
): Promise<void> {
  const db = getClientFirestore();
  if (!db || items.length === 0) return;

  await Promise.all(
    items.map(async (item) => {
      const id = stableNewsId(item.url);
      const ref = doc(db, "users", userId, "newsArchive", id);
      const existing = await getDoc(ref);
      const payload = {
        title: item.title,
        summary: item.summary,
        url: item.url,
        publishedAt: item.publishedAt,
        sourceName: item.sourceName ?? null,
        lastFetchedAt: serverTimestamp(),
        archivedAt: existing.exists()
          ? existing.data().archivedAt
          : serverTimestamp(),
      };
      await setDoc(ref, payload, { merge: true });
    }),
  );
}

export async function listArchivedNews(
  userId: string,
  limit = ARCHIVED_NEWS_DISPLAY_LIMIT,
): Promise<ArchivedNewsDoc[]> {
  const q = query(newsArchiveCollection(userId), orderBy("lastFetchedAt", "desc"));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => mapArchived(d.id, d.data()));
  if (limit <= 0) return items;
  return items.slice(0, limit);
}

export async function getArchivedNews(
  userId: string,
  newsId: string,
): Promise<ArchivedNewsDoc | null> {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  const snap = await getDoc(doc(db, "users", userId, "newsArchive", newsId));
  if (!snap.exists()) return null;
  return mapArchived(snap.id, snap.data());
}
