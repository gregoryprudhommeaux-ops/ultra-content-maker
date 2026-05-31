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
import { toDate } from "./firestore-utils";
import {
  legacyCollectionRef,
  legacyDocRef,
  workspaceCollectionRef,
  workspaceDocRef,
} from "./workspace-scope";

export type ArchivedNewsDoc = NewsSuggestion & {
  archivedAt: Date;
  lastFetchedAt: Date;
};

/** Max items shown on the previous-news archive page. */
export const ARCHIVED_NEWS_DISPLAY_LIMIT = 10;

function newsArchiveCollection(userId: string) {
  return workspaceCollectionRef(userId, "newsArchive");
}

async function listArchivedNewsSnap(userId: string) {
  const q = query(newsArchiveCollection(userId), orderBy("lastFetchedAt", "desc"));
  const scoped = await getDocs(q);
  if (!scoped.empty) return scoped;
  return getDocs(
    query(legacyCollectionRef(userId, "newsArchive"), orderBy("lastFetchedAt", "desc")),
  );
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
  if (items.length === 0) return;

  await Promise.all(
    items.map(async (item) => {
      const id = stableNewsId(item.url);
      const ref = workspaceDocRef(userId, "newsArchive", id);
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
  const snap = await listArchivedNewsSnap(userId);
  const items = snap.docs.map((d) => mapArchived(d.id, d.data()));
  if (limit <= 0) return items;
  return items.slice(0, limit);
}

export async function getArchivedNews(
  userId: string,
  newsId: string,
): Promise<ArchivedNewsDoc | null> {
  let snap = await getDoc(workspaceDocRef(userId, "newsArchive", newsId));
  if (!snap.exists()) {
    snap = await getDoc(legacyDocRef(userId, "newsArchive", newsId));
  }
  if (!snap.exists()) return null;
  return mapArchived(snap.id, snap.data());
}
