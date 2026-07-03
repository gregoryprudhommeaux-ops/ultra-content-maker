import type { Firestore } from "firebase-admin/firestore";
import type { BillingInvoiceTier } from "@/lib/billing/invoice-types";
import {
  createBillingInvoice,
  mapBillingInvoice,
} from "@/lib/billing/invoices.server";
import { monthKeyFromDate } from "@/lib/billing/wire-billing";
import type { WirePaymentCurrency } from "@/lib/billing/wire-pricing";
import { defaultSupportInvoiceAmount } from "@/lib/billing/invoice-template";
import { isSupportTier } from "@/lib/subscription/constants";
import { getSubscriptionProfileServer } from "@/lib/subscription/subscription.server";
import type { SubscriptionTier, SupportProposal } from "@/types/subscription";

function supportMemoReference(userId: string, tier: SubscriptionTier): string {
  const suffix = userId.replace(/-/g, "").slice(-6).toUpperCase();
  const code =
    tier === "support_starter"
      ? "SUP-START"
      : tier === "support_regular"
        ? "SUP-REG"
        : "SUP-TOTAL";
  return `UCM-${suffix}-${code}`;
}

async function findSupportDraft(
  db: Firestore,
  userId: string,
  periodMonth: string,
): Promise<boolean> {
  const snap = await db
    .collection("users")
    .doc(userId)
    .collection("billingInvoices")
    .where("periodMonth", "==", periodMonth)
    .where("kind", "==", "support")
    .limit(6)
    .get();
  return snap.docs.some((doc) => {
    const status = doc.data().status;
    return status !== "paid" && status !== "void";
  });
}

export async function ensureSupportDraftInvoice(
  db: Firestore,
  input: {
    userId: string;
    tier: SubscriptionTier;
    periodMonth: string;
    currency?: WirePaymentCurrency;
    customerEmail?: string;
    customerName?: string;
    locale?: string;
    amount?: number;
    supportProposal?: SupportProposal;
  },
): Promise<{ created: boolean }> {
  if (!isSupportTier(input.tier)) return { created: false };

  const exists = await findSupportDraft(db, input.userId, input.periodMonth);
  if (exists) return { created: false };

  const profile = await getSubscriptionProfileServer(input.userId);
  const currency = input.currency ?? profile.wirePreferredCurrency ?? "eur";
  const contractAmount = profile.supportContract?.monthlyAmount;
  const amount =
    typeof input.amount === "number"
      ? input.amount
      : typeof contractAmount === "number" && contractAmount > 0
        ? contractAmount
        : input.tier === "support_total" && profile.supportProposal?.rhythm === "custom"
          ? 0
          : defaultSupportInvoiceAmount(input.tier as BillingInvoiceTier);

  await createBillingInvoice(db, {
    userId: input.userId,
    periodMonth: input.periodMonth,
    tier: input.tier as BillingInvoiceTier,
    currency,
    amount,
    memoReference: supportMemoReference(input.userId, input.tier),
    status: "draft",
    kind: "support",
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    supportProposal: input.supportProposal ?? profile.supportProposal,
    locale: input.locale,
  });
  return { created: true };
}

export async function runSupportInvoiceDraftCron(
  db: Firestore,
  now = new Date(),
): Promise<{ scanned: number; draftsCreated: number; periodMonth: string }> {
  const periodMonth = monthKeyFromDate(now);
  const snap = await db.collection("users").get();
  let draftsCreated = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const profile = await getSubscriptionProfileServer(doc.id);
    if (!isSupportTier(profile.tier)) continue;

    const email = typeof data.email === "string" ? data.email.trim() : undefined;
    const displayName = typeof data.displayName === "string" ? data.displayName : undefined;
    const locale =
      typeof data.preferredLocale === "string"
        ? data.preferredLocale
        : typeof data.locale === "string"
          ? data.locale
          : undefined;

    const { created } = await ensureSupportDraftInvoice(db, {
      userId: doc.id,
      tier: profile.tier,
      periodMonth,
      customerEmail: email,
      customerName: displayName,
      locale,
    });
    if (created) draftsCreated += 1;
  }

  return { scanned: snap.size, draftsCreated, periodMonth };
}
