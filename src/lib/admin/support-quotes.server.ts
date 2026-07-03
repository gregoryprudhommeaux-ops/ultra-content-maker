import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import {
  buildDefaultProposalDraft,
  normalizeProposalDraft,
  type SupportQuoteProposalDraft,
} from "@/lib/admin/support-quote-proposal-shared";
import {
  defaultCommercialTermsForPlan,
  normalizeCommercialTerms,
} from "@/lib/admin/support-deal-terms";
import { buildProposalDraftForQuoteFromInAppTemplate } from "@/lib/admin/support-proposal-inapp-template.server";
import { sendSupportQuoteProposalEmail } from "@/lib/email/send-support-quote-proposal";
import type { SupportQuotePlan } from "@/lib/email/send-support-quote";
import type { SupportCommercialTerms } from "@/types/subscription";

export type SupportQuoteStatus =
  | "new"
  | "contacted"
  | "quoted"
  | "won"
  | "lost"
  | "archived";

export type SupportQuoteRow = {
  id: string;
  fullName: string;
  companyName: string;
  position: string;
  activityNeed: string;
  email: string;
  whatsapp: string;
  plan: SupportQuotePlan;
  locale?: string;
  pageUrl?: string;
  userId?: string;
  status: SupportQuoteStatus;
  adminNote?: string;
  proposalDraft?: SupportQuoteProposalDraft;
  proposalSentAt?: string | null;
  commercialTerms?: SupportCommercialTerms;
  createdAt: string | null;
  updatedAt: string | null;
};

const VALID_STATUS: SupportQuoteStatus[] = [
  "new",
  "contacted",
  "quoted",
  "won",
  "lost",
  "archived",
];

function quotesCollection(db: Firestore) {
  return db.collection("supportQuoteRequests");
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

function mapDoc(id: string, data: FirebaseFirestore.DocumentData): SupportQuoteRow {
  const plan =
    data.plan === "starter" || data.plan === "regular" || data.plan === "much_more"
      ? data.plan
      : "unspecified";
  const status = data.status as SupportQuoteStatus;
  return {
    id,
    fullName: String(data.fullName ?? ""),
    companyName: String(data.companyName ?? ""),
    position: String(data.position ?? ""),
    activityNeed: String(data.activityNeed ?? ""),
    email: String(data.email ?? ""),
    whatsapp: String(data.whatsapp ?? ""),
    plan,
    locale: data.locale ? String(data.locale) : undefined,
    pageUrl: data.pageUrl ? String(data.pageUrl) : undefined,
    userId: data.userId ? String(data.userId) : undefined,
    status: VALID_STATUS.includes(status) ? status : "new",
    adminNote: data.adminNote ? String(data.adminNote) : undefined,
    proposalDraft: normalizeProposalDraft(data.proposalDraft),
    proposalSentAt: data.proposalSentAt ? String(data.proposalSentAt) : null,
    commercialTerms: normalizeCommercialTerms(data.commercialTerms),
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt),
  };
}

export async function listSupportQuotes(
  db: Firestore,
  limit = 80,
): Promise<SupportQuoteRow[]> {
  const snap = await quotesCollection(db).orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((doc) => mapDoc(doc.id, doc.data()));
}

export async function getSupportQuote(
  db: Firestore,
  quoteId: string,
): Promise<SupportQuoteRow | null> {
  const snap = await quotesCollection(db).doc(quoteId).get();
  if (!snap.exists) return null;
  return mapDoc(snap.id, snap.data() ?? {});
}

export async function updateSupportQuote(
  db: Firestore,
  quoteId: string,
  input: {
    status?: SupportQuoteStatus;
    adminNote?: string;
    proposalDraft?: SupportQuoteProposalDraft;
    proposalSentAt?: string | null;
    commercialTerms?: SupportCommercialTerms;
    userId?: string;
  },
): Promise<SupportQuoteRow | null> {
  const ref = quotesCollection(db).doc(quoteId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const patch: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (input.status && VALID_STATUS.includes(input.status)) {
    patch.status = input.status;
  }
  if (input.adminNote !== undefined) {
    patch.adminNote = input.adminNote.trim() || null;
  }
  if (input.proposalDraft !== undefined) {
    patch.proposalDraft = input.proposalDraft;
  }
  if (input.proposalSentAt !== undefined) {
    patch.proposalSentAt = input.proposalSentAt;
  }
  if (input.commercialTerms !== undefined) {
    patch.commercialTerms = input.commercialTerms;
  }
  if (input.userId !== undefined) {
    patch.userId = input.userId.trim() || null;
  }

  await ref.update(patch);
  const next = await ref.get();
  return mapDoc(next.id, next.data() ?? {});
}

export async function regenerateSupportQuoteProposal(
  db: Firestore,
  quoteId: string,
): Promise<SupportQuoteRow | null> {
  const row = await getSupportQuote(db, quoteId);
  if (!row) return null;
  const commercialTerms = row.commercialTerms ?? defaultCommercialTermsForPlan(row.plan);
  const proposalDraft = await buildProposalDraftForQuoteFromInAppTemplate(db, {
    ...row,
    commercialTerms,
  });
  return updateSupportQuote(db, quoteId, { proposalDraft, commercialTerms });
}

export async function sendSupportQuoteProposal(
  db: Firestore,
  quoteId: string,
  input?: {
    localeOverride?: "fr" | "en" | "es";
    proposalDraft?: SupportQuoteProposalDraft;
    emailSubject?: string;
    emailBody?: string;
  },
): Promise<{ quote: SupportQuoteRow | null; sendError?: string }> {
  const row = await getSupportQuote(db, quoteId);
  if (!row) return { quote: null };

  const proposalDraft = input?.proposalDraft ?? row.proposalDraft ?? buildDefaultProposalDraft(row);
  if (input?.proposalDraft) {
    await updateSupportQuote(db, quoteId, { proposalDraft });
  }

  const send = await sendSupportQuoteProposalEmail({
    quote: row,
    proposal: proposalDraft,
    localeOverride: input?.localeOverride,
    emailSubject: input?.emailSubject,
    emailBody: input?.emailBody,
  });
  if (!send.ok) return { quote: row, sendError: send.error };

  const now = new Date().toISOString();
  const quote = await updateSupportQuote(db, quoteId, {
    proposalDraft,
    proposalSentAt: now,
    status: row.status === "won" || row.status === "lost" || row.status === "archived" ? row.status : "quoted",
  });
  return { quote };
}
