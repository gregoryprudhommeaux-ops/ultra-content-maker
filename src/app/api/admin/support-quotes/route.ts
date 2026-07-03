import { acceptSupportDeal } from "@/lib/admin/support-deal-accept.server";
import {
  listSupportQuotes,
  regenerateSupportQuoteProposal,
  sendSupportQuoteProposal,
  updateSupportQuote,
  type SupportQuoteStatus,
} from "@/lib/admin/support-quotes.server";
import { normalizeCommercialTerms } from "@/lib/admin/support-deal-terms";
import type { SupportQuoteProposalDraft } from "@/lib/admin/support-quote-proposal-shared";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin.server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUS: SupportQuoteStatus[] = [
  "new",
  "contacted",
  "quoted",
  "won",
  "lost",
  "archived",
];

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  try {
    const quotes = await listSupportQuotes(db);
    return NextResponse.json({ quotes });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "load_failed", detail }, { status: 500 });
  }
}

type PatchBody = {
  quoteId?: string;
  status?: string;
  adminNote?: string;
  proposalDraft?: SupportQuoteProposalDraft;
  commercialTerms?: unknown;
  sendLocale?: "fr" | "en" | "es";
  emailSubject?: string;
  emailBody?: string;
  userId?: string;
  action?:
    | "regenerate_proposal"
    | "save_proposal"
    | "send_proposal"
    | "save_commercial_terms"
    | "accept_proposal";
};

export async function PATCH(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
    if (!body.quoteId?.trim()) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const quoteId = body.quoteId.trim();

  try {
    if (body.action === "regenerate_proposal") {
      const quote = await regenerateSupportQuoteProposal(db, quoteId);
      if (!quote) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ quote });
    }

    if (body.action === "save_commercial_terms") {
      const commercialTerms = normalizeCommercialTerms(body.commercialTerms);
      if (!commercialTerms) {
        return NextResponse.json({ error: "invalid_commercial_terms" }, { status: 400 });
      }
      await updateSupportQuote(db, quoteId, { commercialTerms });
      const quote = await regenerateSupportQuoteProposal(db, quoteId);
      if (!quote) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ quote });
    }

    if (body.action === "accept_proposal") {
      const userId = body.userId?.trim();
      if (!userId) {
        return NextResponse.json({ error: "user_id_required" }, { status: 400 });
      }
      const result = await acceptSupportDeal(db, {
        quoteId,
        userId,
        adminUid: auth.uid,
      });
      const quote = await listSupportQuotes(db).then((rows) =>
        rows.find((r) => r.id === quoteId),
      );
      return NextResponse.json({ result, quote: quote ?? null });
    }

    if (body.action === "save_proposal" && body.proposalDraft) {
      const quote = await updateSupportQuote(db, quoteId, {
        proposalDraft: body.proposalDraft,
      });
      if (!quote) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ quote });
    }

    if (body.action === "send_proposal") {
      const { quote, sendError } = await sendSupportQuoteProposal(db, quoteId, {
        proposalDraft: body.proposalDraft,
        localeOverride: body.sendLocale,
        emailSubject: body.emailSubject,
        emailBody: body.emailBody,
      });
      if (!quote) return NextResponse.json({ error: "not_found" }, { status: 404 });
      if (sendError) {
        return NextResponse.json({ error: "send_failed", detail: sendError, quote }, { status: 502 });
      }
      return NextResponse.json({ quote });
    }

    const status =
      body.status && VALID_STATUS.includes(body.status as SupportQuoteStatus)
        ? (body.status as SupportQuoteStatus)
        : undefined;

    const commercialTerms = body.commercialTerms
      ? normalizeCommercialTerms(body.commercialTerms)
      : undefined;

    const updated = await updateSupportQuote(db, quoteId, {
      status,
      adminNote: body.adminNote,
      proposalDraft: body.proposalDraft,
      commercialTerms: commercialTerms ?? undefined,
    });
    if (!updated) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ quote: updated });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    if (detail === "monthly_amount_required") {
      return NextResponse.json({ error: detail }, { status: 400 });
    }
    return NextResponse.json({ error: "update_failed", detail }, { status: 500 });
  }
}
