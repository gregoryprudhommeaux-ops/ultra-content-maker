import {
  addDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { toDate } from "./firestore-utils";
import {
  activeWorkspaceOwnerId,
  allowsLegacyWorkspaceFallback,
  legacyCollectionRef,
  workspaceCollectionRef,
  workspaceDocRef,
} from "./workspace-scope";

export type EditorialAnglePillar = "market" | "expertise" | "build_in_public";
export type EditorialAngleStatus = "queued" | "used" | "dismissed";
export type EditorialAngleSource = "interview" | "manual";

export type EditorialAngleDoc = {
  id: string;
  title: string;
  angle: string;
  pillar: EditorialAnglePillar;
  status: EditorialAngleStatus;
  source: EditorialAngleSource;
  createdAt: Date;
  updatedAt: Date;
  usedAt?: Date;
};

const MAX_QUEUED = 30;

function anglesCollection(userId: string) {
  return workspaceCollectionRef(userId, "editorialAngles");
}

function normalizeKey(title: string, angle: string): string {
  return `${title.trim().toLowerCase()}::${angle.trim().toLowerCase()}`.slice(0, 240);
}

function mapDoc(id: string, data: Record<string, unknown>): EditorialAngleDoc {
  const pillarRaw = String(data.pillar ?? "");
  const pillar: EditorialAnglePillar =
    pillarRaw === "market" ||
    pillarRaw === "expertise" ||
    pillarRaw === "build_in_public"
      ? pillarRaw
      : "expertise";
  const statusRaw = String(data.status ?? "queued");
  const status: EditorialAngleStatus =
    statusRaw === "used" || statusRaw === "dismissed" ? statusRaw : "queued";
  const sourceRaw = String(data.source ?? "interview");
  return {
    id,
    title: String(data.title ?? ""),
    angle: String(data.angle ?? ""),
    pillar,
    status,
    source: sourceRaw === "manual" ? "manual" : "interview",
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    usedAt: data.usedAt ? toDate(data.usedAt) : undefined,
  };
}

export async function listQueuedEditorialAngles(
  userId: string,
  max = 24,
): Promise<EditorialAngleDoc[]> {
  const q = query(
    anglesCollection(userId),
    orderBy("createdAt", "desc"),
    limit(Math.max(max * 2, 40)),
  );
  let snap = await getDocs(q);
  if (snap.empty && allowsLegacyWorkspaceFallback(userId)) {
    snap = await getDocs(
      query(
        legacyCollectionRef(activeWorkspaceOwnerId(userId), "editorialAngles"),
        orderBy("createdAt", "desc"),
        limit(Math.max(max * 2, 40)),
      ),
    );
  }
  return snap.docs
    .map((d) => mapDoc(d.id, d.data() as Record<string, unknown>))
    .filter((a) => a.status === "queued")
    .slice(0, max);
}

/** Balance up to `perPillar` angles per pillar for the dashboard grid. */
export function balanceAnglesByPillar(
  angles: EditorialAngleDoc[],
  perPillar = 2,
): EditorialAngleDoc[] {
  const buckets: Record<EditorialAnglePillar, EditorialAngleDoc[]> = {
    market: [],
    expertise: [],
    build_in_public: [],
  };
  for (const a of angles) {
    if (buckets[a.pillar].length < perPillar) {
      buckets[a.pillar].push(a);
    }
  }
  return [
    ...buckets.market,
    ...buckets.expertise,
    ...buckets.build_in_public,
  ];
}

export async function enqueueEditorialAnglesFromInterview(
  userId: string,
  nextAngles: { title: string; angle: string; pillar?: string }[],
): Promise<number> {
  const cleaned = nextAngles
    .map((item) => ({
      title: item.title.trim(),
      angle: item.angle.trim(),
      pillar:
        item.pillar === "market" ||
        item.pillar === "expertise" ||
        item.pillar === "build_in_public"
          ? item.pillar
          : ("expertise" as const),
    }))
    .filter((item) => item.title.length >= 3 && item.angle.length >= 8);

  if (cleaned.length === 0) return 0;

  const existing = await listQueuedEditorialAngles(userId, MAX_QUEUED);
  const existingKeys = new Set(existing.map((a) => normalizeKey(a.title, a.angle)));
  let added = 0;
  const room = Math.max(0, MAX_QUEUED - existing.length);

  for (const item of cleaned) {
    if (added >= room) break;
    const key = normalizeKey(item.title, item.angle);
    if (existingKeys.has(key)) continue;
    await addDoc(anglesCollection(userId), {
      title: item.title,
      angle: item.angle,
      pillar: item.pillar,
      status: "queued",
      source: "interview",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    existingKeys.add(key);
    added += 1;
  }
  return added;
}

export async function markEditorialAngleUsed(
  userId: string,
  angleId: string,
): Promise<void> {
  await updateDoc(workspaceDocRef(userId, "editorialAngles", angleId), {
    status: "used",
    usedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function dismissEditorialAngle(
  userId: string,
  angleId: string,
): Promise<void> {
  await updateDoc(workspaceDocRef(userId, "editorialAngles", angleId), {
    status: "dismissed",
    updatedAt: serverTimestamp(),
  });
}
