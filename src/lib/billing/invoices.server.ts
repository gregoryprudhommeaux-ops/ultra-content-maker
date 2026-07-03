import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import {
  buildDefaultEmailBody,
  buildDefaultEmailSubject,
  buildDefaultInvoiceBody,
  defaultSupportInvoiceAmount,
  hydrateInvoiceTemplates,
} from "@/lib/billing/invoice-template";
import {
  type BillingInvoiceRow,
  type BillingInvoiceStatus,
  type BillingInvoiceTier,
  formatInvoiceAmount,
  monthKeyFromDate,
  nextMonthKey,
  normalizeInvoiceKind,
  normalizeInvoiceStatus,
  normalizeInvoiceTier,
  wireCoverageEndForMonth,
} from "@/lib/billing/wire-billing";
import { buildWireTransferMemo } from "@/lib/billing/wire-config";
import type { WirePlan } from "@/lib/billing/wire-config.types";
import { wireAmountForCurrency, type WirePaymentCurrency } from "@/lib/billing/wire-pricing";
import { activateTierServer, setSubscriptionProfileServer } from "@/lib/subscription/subscription.server";
import type { SubscriptionTier, SupportProposal } from "@/types/subscription";

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

function normalizeSupportProposal(raw: unknown): SupportProposal | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const rhythm =
    r.rhythm === "starter" || r.rhythm === "regular" || r.rhythm === "custom"
      ? r.rhythm
      : null;
  if (!rhythm) return undefined;
  const period = r.period === "week" || r.period === "month" ? r.period : undefined;
  const postsCount = typeof r.postsCount === "number" ? r.postsCount : undefined;
  return { rhythm, period, postsCount };
}

export function mapBillingInvoice(
  id: string,
  data: FirebaseFirestore.DocumentData,
  userIdFallback = "",
): BillingInvoiceRow {
  const tier = normalizeInvoiceTier(data.tier);
  const kind = normalizeInvoiceKind(data.kind, tier);
  const currency: WirePaymentCurrency = data.currency === "mxn" ? "mxn" : "eur";
  const amountRaw = typeof data.amount === "number" ? data.amount : 0;
  const amount =
    kind === "wire" && (tier === "pro" || tier === "pro_plus")
      ? wireAmountForCurrency(tier, currency)
      : amountRaw;

  const row: BillingInvoiceRow = {
    id,
    userId: String(data.userId ?? userIdFallback),
    periodMonth: String(data.periodMonth ?? ""),
    kind,
    tier,
    currency,
    amount,
    status: normalizeInvoiceStatus(data.status),
    memoReference: String(data.memoReference ?? ""),
    wireRequestId: data.wireRequestId ? String(data.wireRequestId) : undefined,
    customerEmail: data.customerEmail ? String(data.customerEmail) : undefined,
    customerName: data.customerName ? String(data.customerName) : undefined,
    invoiceBody: data.invoiceBody ? String(data.invoiceBody) : undefined,
    emailSubject: data.emailSubject ? String(data.emailSubject) : undefined,
    emailBody: data.emailBody ? String(data.emailBody) : undefined,
    scheduledSendAt: data.scheduledSendAt ? String(data.scheduledSendAt) : null,
    sentAt: data.sentAt ? String(data.sentAt) : null,
    paidAt: data.paidAt ? String(data.paidAt) : null,
    supportProposal: normalizeSupportProposal(data.supportProposal),
    locale: data.locale ? String(data.locale) : undefined,
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt),
  };

  const hydrated = hydrateInvoiceTemplates(row);
  return { ...row, ...hydrated };
}

export async function createBillingInvoice(
  db: Firestore,
  input: {
    userId: string;
    periodMonth: string;
    tier: BillingInvoiceTier;
    currency: WirePaymentCurrency;
    memoReference: string;
    wireRequestId?: string;
    status?: BillingInvoiceStatus;
    kind?: "wire" | "support";
    amount?: number;
    customerEmail?: string;
    customerName?: string;
    supportProposal?: SupportProposal;
    locale?: string;
  },
): Promise<BillingInvoiceRow> {
  const kind = input.kind ?? (input.tier.startsWith("support_") ? "support" : "wire");
  const tier = input.tier;
  const amount =
    typeof input.amount === "number"
      ? input.amount
      : kind === "wire" && (tier === "pro" || tier === "pro_plus")
        ? wireAmountForCurrency(tier as WirePlan, input.currency)
        : defaultSupportInvoiceAmount(tier);

  const draft: BillingInvoiceRow = {
    id: "",
    userId: input.userId,
    periodMonth: input.periodMonth,
    kind,
    tier,
    currency: input.currency,
    amount,
    status: input.status ?? "draft",
    memoReference: input.memoReference,
    wireRequestId: input.wireRequestId,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    supportProposal: input.supportProposal,
    locale: input.locale,
    createdAt: null,
  };
  const templates = hydrateInvoiceTemplates(draft);

  const ref = invoicesCollection(db, input.userId).doc();
  const payload = {
    userId: input.userId,
    periodMonth: input.periodMonth,
    kind,
    tier,
    currency: input.currency,
    amount,
    status: input.status ?? "draft",
    memoReference: input.memoReference,
    wireRequestId: input.wireRequestId ?? null,
    customerEmail: input.customerEmail ?? null,
    customerName: input.customerName ?? null,
    invoiceBody: templates.invoiceBody,
    emailSubject: templates.emailSubject,
    emailBody: templates.emailBody,
    scheduledSendAt: null,
    sentAt: null,
    supportProposal: input.supportProposal ?? null,
    locale: input.locale ?? null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    paidAt: input.status === "paid" ? new Date().toISOString() : null,
  };
  await ref.set(payload);
  const snap = await ref.get();
  return mapBillingInvoice(snap.id, snap.data() ?? payload, input.userId);
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
  return snap.docs.map((doc) => mapBillingInvoice(doc.id, doc.data(), userId));
}

export async function getBillingInvoice(
  db: Firestore,
  userId: string,
  invoiceId: string,
): Promise<BillingInvoiceRow | null> {
  const snap = await invoicesCollection(db, userId).doc(invoiceId).get();
  if (!snap.exists) return null;
  return mapBillingInvoice(snap.id, snap.data() ?? {}, userId);
}

export async function updateBillingInvoice(
  db: Firestore,
  userId: string,
  invoiceId: string,
  patch: {
    status?: BillingInvoiceStatus;
    amount?: number;
    memoReference?: string;
    invoiceBody?: string;
    emailSubject?: string;
    emailBody?: string;
    scheduledSendAt?: string | null;
    customerEmail?: string;
    customerName?: string;
  },
): Promise<BillingInvoiceRow | null> {
  const ref = invoicesCollection(db, userId).doc(invoiceId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (patch.status) update.status = patch.status;
  if (typeof patch.amount === "number") update.amount = patch.amount;
  if (patch.memoReference !== undefined) update.memoReference = patch.memoReference.trim();
  if (patch.invoiceBody !== undefined) update.invoiceBody = patch.invoiceBody;
  if (patch.emailSubject !== undefined) update.emailSubject = patch.emailSubject;
  if (patch.emailBody !== undefined) update.emailBody = patch.emailBody;
  if (patch.scheduledSendAt !== undefined) update.scheduledSendAt = patch.scheduledSendAt;
  if (patch.customerEmail !== undefined) update.customerEmail = patch.customerEmail.trim() || null;
  if (patch.customerName !== undefined) update.customerName = patch.customerName.trim() || null;

  await ref.update(update);
  const next = await ref.get();
  return mapBillingInvoice(next.id, next.data() ?? {}, userId);
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
  await ref.update({ status: "paid", paidAt: now, updatedAt: FieldValue.serverTimestamp() });
  const next = await ref.get();
  return mapBillingInvoice(next.id, next.data() ?? {}, userId);
}

export async function markInvoiceSent(
  db: Firestore,
  userId: string,
  invoiceId: string,
): Promise<BillingInvoiceRow | null> {
  const ref = invoicesCollection(db, userId).doc(invoiceId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const now = new Date().toISOString();
  await ref.update({
    status: "sent",
    sentAt: now,
    scheduledSendAt: null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const next = await ref.get();
  return mapBillingInvoice(next.id, next.data() ?? {}, userId);
}

async function findOpenInvoiceForPeriod(
  db: Firestore,
  userId: string,
  periodMonth: string,
  kind: "wire" | "support",
): Promise<BillingInvoiceRow | null> {
  const snap = await invoicesCollection(db, userId)
    .where("periodMonth", "==", periodMonth)
    .where("kind", "==", kind)
    .limit(12)
    .get();

  for (const doc of snap.docs) {
    const row = mapBillingInvoice(doc.id, doc.data(), userId);
    if (row.status === "void" || row.status === "paid") continue;
    return row;
  }
  return null;
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

  const open = await findOpenInvoiceForPeriod(db, input.userId, input.periodMonth, "wire");

  if (open) {
    await markInvoicePaid(db, input.userId, open.id);
    if (input.wireRequestId) {
      await invoicesCollection(db, input.userId).doc(open.id).update({
        wireRequestId: input.wireRequestId,
      });
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
    kind: "wire",
  });
}

export async function ensureDraftRenewalInvoice(
  db: Firestore,
  input: {
    userId: string;
    tier: WirePlan;
    currency: WirePaymentCurrency;
    periodMonth: string;
    displayName?: string;
    customerEmail?: string;
    locale?: string;
  },
): Promise<{ invoice: BillingInvoiceRow; created: boolean }> {
  const existing = await findOpenInvoiceForPeriod(db, input.userId, input.periodMonth, "wire");
  if (existing) {
    return { invoice: existing, created: false };
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
    status: "draft",
    kind: "wire",
    customerEmail: input.customerEmail,
    customerName: input.displayName,
    locale: input.locale,
  });
  return { invoice, created: true };
}

/** @deprecated use ensureDraftRenewalInvoice */
export const ensurePendingRenewalInvoice = ensureDraftRenewalInvoice;

export function renewalPeriodForReminder(now = new Date()): string {
  const current = monthKeyFromDate(now);
  return nextMonthKey(current) ?? current;
}

export function regenerateInvoiceTemplates(row: BillingInvoiceRow): Pick<
  BillingInvoiceRow,
  "invoiceBody" | "emailSubject" | "emailBody"
> {
  const invoiceBody = buildDefaultInvoiceBody({ invoice: row, locale: row.locale });
  const emailSubject = buildDefaultEmailSubject({ invoice: row, locale: row.locale });
  const emailBody = buildDefaultEmailBody({
    invoice: { ...row, invoiceBody },
    locale: row.locale,
  });
  return { invoiceBody, emailSubject, emailBody };
}

export { formatInvoiceAmount };
