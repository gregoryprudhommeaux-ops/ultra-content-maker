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
  allowsLegacyWorkspaceFallback,
  legacyCollectionRef,
  legacyDocRef,
  workspaceCollectionRef,
  workspaceDocRef,
} from "./workspace-scope";

export type ArchivedNewsDoc = NewsSuggestion & {
  archivedAt: Date;
  lastFetchedAt: Date;
  /** Groups items from the same news scan batch. */
  scanBatchKey?: string;
};

/** Max scan batches shown on the previous-news archive page. */
export const ARCHIVED_NEWS_SCAN_LIMIT = 10;

/** @deprecated Use ARCHIVED_NEWS_SCAN_LIMIT — kept for callers that slice items. */
export const ARCHIVED_NEWS_DISPLAY_LIMIT = ARCHIVED_NEWS_SCAN_LIMIT;

export type NewsScanGroup = {
  batchKey: string;
  scannedAt: Date;
  items: ArchivedNewsDoc[];
};

const ARCHIVED_NEWS_FETCH_CAP = 80;

/** Gap (ms) below which legacy items without scanBatchKey belong to the same scan. */
const LEGACY_SCAN_GAP_MS = 90_000;

function newsArchiveCollection(userId: string) {
  return workspaceCollectionRef(userId, "newsArchive");
}

async function listArchivedNewsSnap(userId: string) {
  const q = query(newsArchiveCollection(userId), orderBy("lastFetchedAt", "desc"));
  const scoped = await getDocs(q);
  if (!scoped.empty) return scoped;
  if (!allowsLegacyWorkspaceFallback(userId)) return scoped;
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
    scanBatchKey:
      typeof d.scanBatchKey === "string" && d.scanBatchKey.trim()
        ? d.scanBatchKey.trim()
        : undefined,
  };
}

/** Group archived items into scan batches (newest first), capped at `maxScans`. */
export function groupArchivedNewsByScan(
  items: ArchivedNewsDoc[],
  maxScans = ARCHIVED_NEWS_SCAN_LIMIT,
): NewsScanGroup[] {
  const sorted = [...items].sort(
    (a, b) => b.lastFetchedAt.getTime() - a.lastFetchedAt.getTime(),
  );

  const groups: NewsScanGroup[] = [];

  for (const item of sorted) {
    const t = item.lastFetchedAt.getTime();
    const current = groups[groups.length - 1];
    const anchor = current?.items[current.items.length - 1];

    let joinCurrent = false;
    if (current && anchor) {
      if (item.scanBatchKey && item.scanBatchKey === current.batchKey) {
        joinCurrent = true;
      } else if (
        !item.scanBatchKey &&
        !anchor.scanBatchKey &&
        anchor.lastFetchedAt.getTime() - t <= LEGACY_SCAN_GAP_MS
      ) {
        joinCurrent = true;
      }
    }

    if (joinCurrent && current) {
      current.items.push(item);
      if (t > current.scannedAt.getTime()) {
        current.scannedAt = new Date(t);
      }
    } else {
      groups.push({
        batchKey: item.scanBatchKey ?? `legacy-${t}`,
        scannedAt: item.lastFetchedAt,
        items: [item],
      });
    }
  }

  groups.sort((a, b) => b.scannedAt.getTime() - a.scannedAt.getTime());
  for (const group of groups) {
    group.items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }
  return groups.slice(0, maxScans);
}

/** Persist suggestions from a fetch so they can be reused without new LLM calls. */
export async function upsertNewsArchiveBatch(
  userId: string,
  items: NewsSuggestion[],
  scanBatchKey?: string,
): Promise<void> {
  if (items.length === 0) return;

  const batchKey = scanBatchKey?.trim() || new Date().toISOString();

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
        scanBatchKey: batchKey,
        lastFetchedAt: serverTimestamp(),
        archivedAt: existing.exists()
          ? existing.data().archivedAt
          : serverTimestamp(),
      };
      await setDoc(ref, payload, { merge: true });
    }),
  );
}

/** Load enough archived items to build up to {@link ARCHIVED_NEWS_SCAN_LIMIT} scan groups. */
export async function listArchivedNewsForScans(userId: string): Promise<ArchivedNewsDoc[]> {
  const snap = await listArchivedNewsSnap(userId);
  const items = snap.docs.map((d) => mapArchived(d.id, d.data()));
  return items.slice(0, ARCHIVED_NEWS_FETCH_CAP);
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
  if (!snap.exists() && allowsLegacyWorkspaceFallback(userId)) {
    snap = await getDoc(legacyDocRef(userId, "newsArchive", newsId));
  }
  if (!snap.exists()) return null;
  return mapArchived(snap.id, snap.data());
}
