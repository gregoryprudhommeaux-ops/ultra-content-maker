import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import {
  type BillingInvoiceRow,
  formatInvoiceAmount,
  monthKeyFromDate,
  nextMonthKey,
  wireCoverageEndForMonth,
} from "@/lib/billing/wire-billing";
import { buildWireTransferMemo } from "@/lib/billing/wire-config";
import type { WirePlan } from "@/lib/billing/wire-config.types";
import { wireAmountForCurrency, type WirePaymentCurrency } from "@/lib/billing/wire-pricing";
import { activateTierServer, setSubscriptionProfileServer } from "@/lib/subscription/subscription.server";
import type { SubscriptionTier } from "@/types/subscription";

function invoicesCollection(db: Firestore, userId: string) {
  return db.collection("users").doc(userId).collection("billingInvoices");
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

function mapInvoice(id: string, data: FirebaseFirestore.DocumentData): BillingInvoiceRow {
  const tier = data.tier === "pro_plus" ? "pro_plus" : "pro";
  const currency = data.currency === "mxn" ? "mxn" : "eur";
  const status =
    data.status === "paid" || data.status === "void" ? data.status : "pending";
  return {
    id,
    userId: String(data.userId ?? ""),
    periodMonth: String(data.periodMonth ?? ""),
    tier,
    currency,
    amount: typeof data.amount === "number" ? data.amount : 0,
    status,
    memoReference: String(data.memoReference ?? ""),
    wireRequestId: data.wireRequestId ? String(data.wireRequestId) : undefined,
    createdAt: toIsoDate(data.createdAt),
    paidAt: data.paidAt ? String(data.paidAt) : undefined,
  };
}

export async function createBillingInvoice(
  db: Firestore,
  input: {
    userId: string;
    periodMonth: string;
    tier: WirePlan;
    currency: WirePaymentCurrency;
    memoReference: string;
    wireRequestId?: string;
    status?: "pending" | "paid";
  },
): Promise<BillingInvoiceRow> {
  const ref = invoicesCollection(db, input.userId).doc();
  const amount = wireAmountForCurrency(input.tier, input.currency);
  const payload = {
    userId: input.userId,
    periodMonth: input.periodMonth,
    tier: input.tier,
    currency: input.currency,
    amount,
    status: input.status ?? "pending",
    memoReference: input.memoReference,
    wireRequestId: input.wireRequestId ?? null,
    createdAt: FieldValue.serverTimestamp(),
    paidAt: input.status === "paid" ? new Date().toISOString() : null,
  };
  await ref.set(payload);
  const snap = await ref.get();
  return mapInvoice(snap.id, snap.data() ?? payload);
}

export async function listBillingInvoicesForUser(
  db: Firestore,
  userId: string,
  limit = 24,
): Promise<BillingInvoiceRow[]> {
  const snap = await invoicesCollection(db, userId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((doc) => mapInvoice(doc.id, doc.data()));
}

export async function markInvoicePaid(
  db: Firestore,
  userId: string,
  invoiceId: string,
): Promise<BillingInvoiceRow | null> {
  const ref = invoicesCollection(db, userId).doc(invoiceId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const now = new Date().toISOString();
  await ref.update({ status: "paid", paidAt: now });
  const next = await ref.get();
  return mapInvoice(next.id, next.data() ?? {});
}

export async function extendWireSubscriptionOnPayment(
  db: Firestore,
  input: {
    userId: string;
    tier: WirePlan;
    currency: WirePaymentCurrency;
    periodMonth: string;
    wireRequestId?: string;
    displayName?: string;
  },
): Promise<void> {
  const subscriptionTier: SubscriptionTier = input.tier === "pro" ? "pro" : "pro_plus";
  const coverageEnd = wireCoverageEndForMonth(input.periodMonth);
  if (!coverageEnd) return;

  await activateTierServer(input.userId, subscriptionTier, "wire");
  await setSubscriptionProfileServer(input.userId, {
    wireCoverageEnd: coverageEnd.toISOString(),
    wirePreferredCurrency: input.currency,
    wirePlan: input.tier,
  });

  const pending = await invoicesCollection(db, input.userId)
    .where("periodMonth", "==", input.periodMonth)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (!pending.empty) {
    await markInvoicePaid(db, input.userId, pending.docs[0].id);
    if (input.wireRequestId) {
      await pending.docs[0].ref.update({ wireRequestId: input.wireRequestId });
    }
    return;
  }

  const memo = buildWireTransferMemo({
    userId: input.userId,
    tier: input.tier,
    displayName: input.displayName,
  });
  await createBillingInvoice(db, {
    userId: input.userId,
    periodMonth: input.periodMonth,
    tier: input.tier,
    currency: input.currency,
    memoReference: memo,
    wireRequestId: input.wireRequestId,
    status: "paid",
  });
}

export async function ensurePendingRenewalInvoice(
  db: Firestore,
  input: {
    userId: string;
    tier: WirePlan;
    currency: WirePaymentCurrency;
    periodMonth: string;
    displayName?: string;
  },
): Promise<{ invoice: BillingInvoiceRow; created: boolean }> {
  const existing = await invoicesCollection(db, input.userId)
    .where("periodMonth", "==", input.periodMonth)
    .where("status", "==", "pending")
    .limit(1)
    .get();
  if (!existing.empty) {
    return {
      invoice: mapInvoice(existing.docs[0].id, existing.docs[0].data()),
      created: false,
    };
  }

  const memo = buildWireTransferMemo({
    userId: input.userId,
    tier: input.tier,
    displayName: input.displayName,
  });
  const invoice = await createBillingInvoice(db, {
    userId: input.userId,
    periodMonth: input.periodMonth,
    tier: input.tier,
    currency: input.currency,
    memoReference: memo,
    status: "pending",
  });
  return { invoice, created: true };
}

export function renewalPeriodForReminder(now = new Date()): string {
  const current = monthKeyFromDate(now);
  return nextMonthKey(current) ?? current;
}

export { formatInvoiceAmount };
