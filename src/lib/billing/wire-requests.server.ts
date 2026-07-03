import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import {
  buildWireReference,
  buildWireTransferMemo,
} from "@/lib/billing/wire-config";
import type { WirePlan } from "@/lib/billing/wire-config.types";
import {
  monthKeyFromDate,
  nextMonthKey,
  wireCoverageMonth,
} from "@/lib/billing/wire-billing";
import { extendWireSubscriptionOnPayment } from "@/lib/billing/invoices.server";
import { sendWireActivatedEmail } from "@/lib/email/send-wire-activated";
import {
  wireAmountForCurrency,
  type WirePaymentCurrency,
} from "@/lib/billing/wire-pricing";
import { getSubscriptionProfileServer } from "@/lib/subscription/subscription.server";

export type WireRequestStatus = "pending" | "wire_sent" | "approved" | "rejected";

export type WireRequestRow = {
  id: string;
  userId: string;
  userEmail: string;
  displayName?: string;
  tier: WirePlan;
  currency: WirePaymentCurrency;
  amount: number;
  transferMemo: string;
  periodMonth: string;
  reference: string;
  status: WireRequestStatus;
  userNote?: string;
  locale?: string;
  createdAt: string | null;
  updatedAt: string | null;
  resolvedAt?: string | null;
  /** @deprecated legacy USD field */
  amountUsd?: number;
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

async function resolvePaymentPeriodMonth(userId: string): Promise<string> {
  const profile = await getSubscriptionProfileServer(userId);
  const current = monthKeyFromDate();
  const coverage = wireCoverageMonth(profile);
  if (!coverage) return current;
  if (coverage >= current) {
    return nextMonthKey(coverage) ?? current;
  }
  return current;
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
  const currency: WirePaymentCurrency = data.currency === "mxn" ? "mxn" : "eur";
  const amount =
    typeof data.amount === "number"
      ? data.amount
      : typeof data.amountUsd === "number"
        ? data.amountUsd
        : wireAmountForCurrency(tier, currency);
  const reference = String(data.reference ?? buildWireReference(String(data.userId ?? ""), tier));
  const transferMemo =
    typeof data.transferMemo === "string" && data.transferMemo.trim()
      ? data.transferMemo
      : buildWireTransferMemo({
          userId: String(data.userId ?? ""),
          tier,
          displayName: data.displayName ? String(data.displayName) : undefined,
        });

  return {
    id,
    userId: String(data.userId ?? ""),
    userEmail: String(data.userEmail ?? ""),
    displayName: data.displayName ? String(data.displayName) : undefined,
    tier,
    currency,
    amount,
    transferMemo,
    periodMonth:
      typeof data.periodMonth === "string" && data.periodMonth
        ? data.periodMonth
        : monthKeyFromDate(),
    reference,
    status: validStatus.includes(status) ? status : "pending",
    userNote: data.userNote ? String(data.userNote) : undefined,
    locale: data.locale ? String(data.locale) : undefined,
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt),
    resolvedAt: data.resolvedAt ? String(data.resolvedAt) : undefined,
    amountUsd: typeof data.amountUsd === "number" ? data.amountUsd : undefined,
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
    currency: WirePaymentCurrency;
    locale?: string;
  },
): Promise<WireRequestRow> {
  const existing = await findOpenWireRequest(db, input.userId, input.tier);
  if (existing) {
    if (existing.status === "pending" && existing.currency !== input.currency) {
      const updated = await updatePendingWireRequestCurrency(
        db,
        existing.id,
        input.userId,
        input.currency,
      );
      return updated ?? existing;
    }
    return existing;
  }

  const periodMonth = await resolvePaymentPeriodMonth(input.userId);
  const reference = buildWireReference(input.userId, input.tier);
  const transferMemo = buildWireTransferMemo({
    userId: input.userId,
    tier: input.tier,
    displayName: input.displayName,
  });
  const amount = wireAmountForCurrency(input.tier, input.currency);

  const ref = itemsCollection(db).doc();
  const payload = {
    userId: input.userId,
    userEmail: input.userEmail,
    displayName: input.displayName ?? null,
    tier: input.tier,
    currency: input.currency,
    amount,
    transferMemo,
    periodMonth,
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

export type MarkWireRequestSentResult = {
  row: WireRequestRow;
  /** True when status transitioned to wire_sent (admin should be notified). */
  newlyMarked: boolean;
};

export async function markWireRequestSent(
  db: Firestore,
  requestId: string,
  userId: string,
  userNote?: string,
): Promise<MarkWireRequestSentResult | null> {
  const ref = itemsCollection(db).doc(requestId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (data?.userId !== userId) return null;
  if (data?.status === "approved" || data?.status === "rejected") {
    return { row: mapDoc(snap.id, data), newlyMarked: false };
  }
  if (data?.status === "wire_sent") {
    return { row: mapDoc(snap.id, data), newlyMarked: false };
  }

  await ref.update({
    status: "wire_sent",
    userNote: userNote?.trim() || data?.userNote || null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const next = await ref.get();
  return { row: mapDoc(next.id, next.data() ?? {}), newlyMarked: true };
}

export async function updatePendingWireRequestCurrency(
  db: Firestore,
  requestId: string,
  userId: string,
  currency: WirePaymentCurrency,
): Promise<WireRequestRow | null> {
  const ref = itemsCollection(db).doc(requestId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (data?.userId !== userId) return null;
  if (data?.status !== "pending") {
    return mapDoc(snap.id, data);
  }
  const tier: WirePlan = data.tier === "pro_plus" ? "pro_plus" : "pro";
  if (data.currency === currency) {
    return mapDoc(snap.id, data);
  }

  await ref.update({
    currency,
    amount: wireAmountForCurrency(tier, currency),
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

  await extendWireSubscriptionOnPayment(db, {
    userId: row.userId,
    tier: row.tier,
    currency: row.currency,
    periodMonth: row.periodMonth,
    wireRequestId: requestId,
    displayName: row.displayName,
  });

  await ref.update({
    status: "approved",
    resolvedAt: now,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const next = await ref.get();
  const approved = mapDoc(next.id, next.data() ?? {});
  void sendWireActivatedEmail(approved).catch(() => undefined);
  return approved;
}
