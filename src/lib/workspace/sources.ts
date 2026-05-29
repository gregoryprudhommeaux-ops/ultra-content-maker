import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import type {
  InspirationAspect,
  SourceCategory,
  SourceLink,
  SourceType,
} from "@/types/workspace";
import { isInspirationAspect } from "@/lib/inspiration/aspects";
import { getClientFirestore } from "@/lib/firebase/client";
import { toDate } from "./firestore-utils";

function sourcesCollection(userId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return collection(db, "users", userId, "sources");
}

function normalizeCategory(
  raw: unknown,
  type: SourceType,
): SourceCategory {
  if (raw === "my_post" || raw === "inspiration_post" || raw === "inspiration_profile") {
    return raw;
  }
  if (type === "linkedin_post") return "my_post";
  if (type === "linkedin_profile") return "inspiration_profile";
  return "my_post";
}

function mapDoc(id: string, data: Record<string, unknown>, index: number): SourceLink {
  const type = data.type as SourceType;
  const likedRaw = data.likedAspects;
  const likedAspects = Array.isArray(likedRaw)
    ? likedRaw.filter((a): a is InspirationAspect => isInspirationAspect(String(a)))
    : undefined;

  return {
    id,
    type,
    url: data.url as string,
    label: (data.label as string) || undefined,
    category: normalizeCategory(data.category, type),
    likedAspects: likedAspects?.length ? likedAspects : undefined,
    whyLike: (data.whyLike as string) || undefined,
    sortOrder: (data.sortOrder as number) ?? index,
    createdAt: toDate(data.createdAt),
  };
}

const MAX_SOURCES_PER_CATEGORY = 20;

function normalizeUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

export async function listSources(userId: string): Promise<SourceLink[]> {
  const snap = await getDocs(sourcesCollection(userId));
  const items = snap.docs.map((d, i) =>
    mapDoc(d.id, d.data() as Record<string, unknown>, i),
  );
  return items.sort((a, b) => {
    const orderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export async function listSourcesByCategory(
  userId: string,
  category: SourceCategory,
): Promise<SourceLink[]> {
  const all = await listSources(userId);
  return all.filter((s) => s.category === category);
}

export type AddSourceInput = {
  type: SourceType;
  url: string;
  label?: string;
  category: SourceCategory;
  likedAspects?: InspirationAspect[];
  whyLike?: string;
};

export async function addSource(userId: string, input: AddSourceInput): Promise<string> {
  const existing = await listSources(userId);
  const inCategory = existing.filter((s) => s.category === input.category);
  if (inCategory.length >= MAX_SOURCES_PER_CATEGORY) {
    throw new Error("max_sources_per_category");
  }
  const normalized = normalizeUrl(input.url);
  if (inCategory.some((s) => normalizeUrl(s.url) === normalized)) {
    throw new Error("duplicate_url");
  }
  const ref = await addDoc(sourcesCollection(userId), {
    type: input.type,
    url: input.url,
    label: input.label ?? null,
    category: input.category,
    likedAspects: input.likedAspects?.length ? input.likedAspects : null,
    whyLike: input.whyLike?.trim() || null,
    sortOrder: existing.length,
    createdAt: serverTimestamp(),
  });
  const id = ref.id;
  const { getAuthorProfile } = await import("@/lib/workspace/author");
  const author = await getAuthorProfile(userId);
  const { syncPersonaAfterProfileChange } = await import(
    "@/lib/persona/sync-after-profile-save"
  );
  await syncPersonaAfterProfileChange(userId, author?.contentLanguage);
  return id;
}

export async function removeSource(userId: string, sourceId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  await deleteDoc(doc(db, "users", userId, "sources", sourceId));
  const { getAuthorProfile } = await import("@/lib/workspace/author");
  const author = await getAuthorProfile(userId);
  const { syncPersonaAfterProfileChange } = await import(
    "@/lib/persona/sync-after-profile-save"
  );
  await syncPersonaAfterProfileChange(userId, author?.contentLanguage);
}
