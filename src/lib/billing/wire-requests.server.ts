import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import {
  buildWireReference,
  wireAmountUsd,
  type WirePlan,
} from "@/lib/billing/wire-config";
import { activateTierServer } from "@/lib/subscription/subscription.server";

export type WireRequestStatus = "pending" | "wire_sent" | "approved" | "rejected";

export type WireRequestRow = {
  id: string;
  userId: string;
  userEmail: string;
  displayName?: string;
  tier: WirePlan;
  amountUsd: number;
  reference: string;
  status: WireRequestStatus;
  userNote?: string;
  locale?: string;
  createdAt: string | null;
  updatedAt: string | null;
  resolvedAt?: string | null;
};

function itemsCollection(db: Firestore) {
  return db.collection("platform").doc("wireRequests").collection("items");
}

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return null;
}

function mapDoc(id: string, data: FirebaseFirestore.DocumentData): WireRequestRow {
  const tier = data.tier === "pro_plus" ? "pro_plus" : "pro";
  const status = data.status as WireRequestStatus;
  const validStatus: WireRequestStatus[] = [
    "pending",
    "wire_sent",
    "approved",
    "rejected",
  ];
  return {
    id,
    userId: String(data.userId ?? ""),
    userEmail: String(data.userEmail ?? ""),
    displayName: data.displayName ? String(data.displayName) : undefined,
    tier,
    amountUsd: typeof data.amountUsd === "number" ? data.amountUsd : wireAmountUsd(tier),
    reference: String(data.reference ?? ""),
    status: validStatus.includes(status) ? status : "pending",
    userNote: data.userNote ? String(data.userNote) : undefined,
    locale: data.locale ? String(data.locale) : undefined,
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt),
    resolvedAt: data.resolvedAt ? String(data.resolvedAt) : undefined,
  };
}

export async function findOpenWireRequest(
  db: Firestore,
  userId: string,
  tier: WirePlan,
): Promise<WireRequestRow | null> {
  const snap = await itemsCollection(db)
    .where("userId", "==", userId)
    .where("tier", "==", tier)
    .limit(5)
    .get();

  for (const doc of snap.docs) {
    const row = mapDoc(doc.id, doc.data());
    if (row.status === "pending" || row.status === "wire_sent") return row;
  }
  return null;
}

export async function createWireRequest(
  db: Firestore,
  input: {
    userId: string;
    userEmail: string;
    displayName?: string;
    tier: WirePlan;
    locale?: string;
  },
): Promise<WireRequestRow> {
  const existing = await findOpenWireRequest(db, input.userId, input.tier);
  if (existing) return existing;

  const ref = itemsCollection(db).doc();
  const reference = buildWireReference(input.userId, input.tier);
  const payload = {
    userId: input.userId,
    userEmail: input.userEmail,
    displayName: input.displayName ?? null,
    tier: input.tier,
    amountUsd: wireAmountUsd(input.tier),
    reference,
    status: "pending" satisfies WireRequestStatus,
    locale: input.locale ?? null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(payload);
  const snap = await ref.get();
  return mapDoc(snap.id, snap.data() ?? payload);
}

export async function markWireRequestSent(
  db: Firestore,
  requestId: string,
  userId: string,
  userNote?: string,
): Promise<WireRequestRow | null> {
  const ref = itemsCollection(db).doc(requestId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (data?.userId !== userId) return null;
  if (data?.status === "approved" || data?.status === "rejected") {
    return mapDoc(snap.id, data);
  }

  await ref.update({
    status: "wire_sent",
    userNote: userNote?.trim() || data?.userNote || null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const next = await ref.get();
  return mapDoc(next.id, next.data() ?? {});
}

export async function listWireRequests(
  db: Firestore,
  limit = 50,
): Promise<WireRequestRow[]> {
  const snap = await itemsCollection(db)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => mapDoc(doc.id, doc.data()));
}

export async function listWireRequestsForUser(
  db: Firestore,
  userId: string,
): Promise<WireRequestRow[]> {
  const snap = await itemsCollection(db).where("userId", "==", userId).limit(20).get();
  return snap.docs
    .map((doc) => mapDoc(doc.id, doc.data()))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function resolveWireRequest(
  db: Firestore,
  requestId: string,
  action: "approve" | "reject",
): Promise<WireRequestRow | null> {
  const ref = itemsCollection(db).doc(requestId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const row = mapDoc(snap.id, snap.data() ?? {});

  if (row.status === "approved" || row.status === "rejected") {
    return row;
  }

  const now = new Date().toISOString();
  if (action === "reject") {
    await ref.update({
      status: "rejected",
      resolvedAt: now,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const next = await ref.get();
    return mapDoc(next.id, next.data() ?? {});
  }

  const subscriptionTier = row.tier === "pro" ? "pro" : "pro_plus";
  await activateTierServer(row.userId, subscriptionTier, "wire");
  await ref.update({
    status: "approved",
    resolvedAt: now,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const next = await ref.get();
  return mapDoc(next.id, next.data() ?? {});
}
