import type { Firestore } from "firebase-admin/firestore";
import { monthKeyFromDate } from "@/lib/billing/wire-billing";
import { ensureSupportDraftInvoice } from "@/lib/billing/support-invoices.server";
import {
  buildSupportContractFromTerms,
  defaultCommercialTermsForPlan,
  normalizeCommercialTerms,
  supportProposalFromDeal,
  tierFromSupportPlan,
} from "@/lib/admin/support-deal-terms";
import { getSupportQuote, updateSupportQuote } from "@/lib/admin/support-quotes.server";
import { activateTierServer } from "@/lib/subscription/subscription.server";
import type { SupportContract } from "@/types/subscription";

export type AcceptSupportDealResult = {
  quoteId: string;
  userId: string;
  tier: string;
  contract: SupportContract;
  invoiceCreated: boolean;
};

export async function acceptSupportDeal(
  db: Firestore,
  input: {
    quoteId: string;
    userId: string;
    adminUid: string;
  },
): Promise<AcceptSupportDealResult> {
  const row = await getSupportQuote(db, input.quoteId);
  if (!row) throw new Error("quote_not_found");

  const terms =
    normalizeCommercialTerms(row.commercialTerms) ??
    defaultCommercialTermsForPlan(row.plan);

  if (terms.monthlyAmount <= 0) {
    throw new Error("monthly_amount_required");
  }

  const tier = tierFromSupportPlan(row.plan);
  const supportProposal = supportProposalFromDeal(row.plan, terms);
  const contract = buildSupportContractFromTerms(terms, row.id);

  await activateTierServer(input.userId, tier, "admin", {
    grantedByAdminUid: input.adminUid,
    supportProposal,
    supportContract: contract,
  });

  await updateSupportQuote(db, input.quoteId, {
    status: "won",
    commercialTerms: terms,
    userId: input.userId,
  });

  const periodMonth = monthKeyFromDate(new Date());
  const { created } = await ensureSupportDraftInvoice(db, {
    userId: input.userId,
    tier,
    periodMonth,
    currency: terms.currency,
    amount: terms.monthlyAmount,
    customerEmail: row.email,
    customerName: row.fullName || row.companyName,
    locale: row.locale,
    supportProposal,
  });

  return {
    quoteId: input.quoteId,
    userId: input.userId,
    tier,
    contract,
    invoiceCreated: created,
  };
}
