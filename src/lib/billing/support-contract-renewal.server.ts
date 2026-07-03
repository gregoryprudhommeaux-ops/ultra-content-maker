import type { Firestore } from "firebase-admin/firestore";
import { monthKeyFromDate } from "@/lib/billing/wire-billing";
import { ensureSupportDraftInvoice } from "@/lib/billing/support-invoices.server";
import { addMonthsUtc } from "@/lib/admin/support-deal-terms";
import { isSupportTier } from "@/lib/subscription/constants";
import {
  getSubscriptionProfileServer,
  setSubscriptionProfileServer,
} from "@/lib/subscription/subscription.server";
import type {
  SubscriptionTier,
  SupportContract,
  SupportRenewalStatus,
} from "@/types/subscription";

export const RENEWAL_NOTICE_DAYS = 30;

export type SupportRenewalDueRow = {
  userId: string;
  email: string;
  displayName: string | null;
  tier: SubscriptionTier;
  contractEndAt: string;
  daysRemaining: number;
  monthlyAmount: number;
  currency: "eur" | "mxn";
  renewalStatus: SupportRenewalStatus;
  sourceQuoteId?: string;
};

function daysUntil(iso: string, now = new Date()): number {
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return 9999;
  const ms = end.getTime() - now.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function renewalStatusFromContract(contract: SupportContract): SupportRenewalStatus {
  return contract.renewalStatus ?? "active";
}

export async function listSupportRenewalsDue(
  db: Firestore,
  windowDays = RENEWAL_NOTICE_DAYS,
  now = new Date(),
): Promise<SupportRenewalDueRow[]> {
  const snap = await db.collection("users").get();
  const rows: SupportRenewalDueRow[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const profile = await getSubscriptionProfileServer(doc.id);
    if (!isSupportTier(profile.tier)) continue;
    const contract = profile.supportContract;
    if (!contract?.contractEndAt) continue;

    const status = renewalStatusFromContract(contract);
    if (status === "not_renewing") continue;

    const daysRemaining = daysUntil(contract.contractEndAt, now);
    if (daysRemaining > windowDays) continue;

    const email = typeof data.email === "string" ? data.email.trim() : "";
    const displayName =
      typeof data.displayName === "string" ? data.displayName.trim() || null : null;

    rows.push({
      userId: doc.id,
      email,
      displayName,
      tier: profile.tier,
      contractEndAt: contract.contractEndAt,
      daysRemaining,
      monthlyAmount: contract.monthlyAmount,
      currency: contract.currency,
      renewalStatus:
        status === "renewal_due" || daysRemaining <= windowDays ? "renewal_due" : "active",
      sourceQuoteId: contract.sourceQuoteId,
    });
  }

  return rows.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export async function extendSupportContract(
  db: Firestore,
  userId: string,
  months?: number,
): Promise<{ contract: SupportContract; invoiceCreated: boolean }> {
  const profile = await getSubscriptionProfileServer(userId);
  if (!isSupportTier(profile.tier)) throw new Error("not_support_tier");
  const contract = profile.supportContract;
  if (!contract) throw new Error("no_contract");

  const extensionMonths = months ?? contract.minCommitmentMonths ?? 3;
  const now = new Date();
  const end = new Date(contract.contractEndAt);
  const baseIso =
    !Number.isNaN(end.getTime()) && end.getTime() > now.getTime()
      ? contract.contractEndAt
      : now.toISOString();

  const updated: SupportContract = {
    ...contract,
    contractEndAt: addMonthsUtc(baseIso, extensionMonths),
    renewalStatus: "active",
    lastRenewalReminderAt: undefined,
  };

  await setSubscriptionProfileServer(userId, { supportContract: updated });

  const userSnap = await db.collection("users").doc(userId).get();
  const userData = userSnap.data() ?? {};
  const email = typeof userData.email === "string" ? userData.email.trim() : undefined;
  const customerName =
    typeof userData.displayName === "string" ? userData.displayName : undefined;
  const locale =
    typeof userData.preferredLocale === "string"
      ? userData.preferredLocale
      : typeof userData.locale === "string"
        ? userData.locale
        : undefined;

  const { created } = await ensureSupportDraftInvoice(db, {
    userId,
    tier: profile.tier,
    periodMonth: monthKeyFromDate(now),
    currency: contract.currency,
    amount: contract.monthlyAmount,
    customerEmail: email,
    customerName,
    locale,
    supportProposal: profile.supportProposal,
  });

  return { contract: updated, invoiceCreated: created };
}

export async function markSupportContractNotRenewing(
  userId: string,
): Promise<SupportContract> {
  const profile = await getSubscriptionProfileServer(userId);
  const contract = profile.supportContract;
  if (!contract) throw new Error("no_contract");

  const updated: SupportContract = {
    ...contract,
    renewalStatus: "not_renewing",
  };
  await setSubscriptionProfileServer(userId, { supportContract: updated });
  return updated;
}

export async function runSupportRenewalReminderCron(
  db: Firestore,
  now = new Date(),
): Promise<{ scanned: number; flagged: number; windowDays: number }> {
  const snap = await db.collection("users").get();
  let flagged = 0;

  for (const doc of snap.docs) {
    const profile = await getSubscriptionProfileServer(doc.id);
    if (!isSupportTier(profile.tier)) continue;
    const contract = profile.supportContract;
    if (!contract?.contractEndAt) continue;
    if (contract.renewalStatus === "not_renewing") continue;

    const daysRemaining = daysUntil(contract.contractEndAt, now);
    if (daysRemaining > RENEWAL_NOTICE_DAYS) continue;

    const endKey = contract.contractEndAt.slice(0, 10);
    const alreadyReminded =
      contract.lastRenewalReminderAt?.slice(0, 10) === endKey &&
      contract.renewalStatus === "renewal_due";
    if (alreadyReminded) continue;

    await setSubscriptionProfileServer(doc.id, {
      supportContract: {
        ...contract,
        renewalStatus: "renewal_due",
        lastRenewalReminderAt: now.toISOString(),
      },
    });
    flagged += 1;
  }

  return { scanned: snap.size, flagged, windowDays: RENEWAL_NOTICE_DAYS };
}
