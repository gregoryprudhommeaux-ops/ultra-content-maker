import {
  createWireRequest,
  findOpenWireRequest,
  listWireRequestsForUser,
  markWireRequestSent,
  updatePendingWireRequestCurrency,
} from "@/lib/billing/wire-requests.server";
import {
  getWireBankDetailsForCurrency,
  getWireBankDetailsMx,
  getWireBankDetailsSepa,
} from "@/lib/billing/wire-config";
import type { WirePlan } from "@/lib/billing/wire-config";
import type { WirePaymentCurrency } from "@/lib/billing/wire-pricing";
import { sendWirePaymentInstructionsEmail } from "@/lib/email/send-wire-customer-email";
import { sendWireRequestNotification } from "@/lib/email/send-wire-request";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseTier(raw: unknown): WirePlan | null {
  return raw === "pro" || raw === "pro_plus" ? raw : null;
}

function parseCurrency(raw: unknown): WirePaymentCurrency | null {
  return raw === "eur" || raw === "mxn" ? raw : null;
}

export async function GET(request: Request) {
  const userId = await verifyBearerUserId(request.headers.get("Authorization"));
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const tier = parseTier(url.searchParams.get("tier"));
  const currency = parseCurrency(url.searchParams.get("currency")) ?? "eur";
  const bank = getWireBankDetailsForCurrency(currency);
  const banks = {
    mxn: getWireBankDetailsMx(),
    eur: getWireBankDetailsSepa(),
  };

  try {
    if (tier) {
      const open = await findOpenWireRequest(db, userId, tier);
      return NextResponse.json({ request: open, bank, banks });
    }
    const requests = await listWireRequestsForUser(db, userId);
    return NextResponse.json({ requests, bank, banks });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "load_failed", detail }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await verifyBearerUserId(request.headers.get("Authorization"));
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  let body: {
    tier?: string;
    currency?: string;
    userEmail?: string;
    displayName?: string;
    locale?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const tier = parseTier(body.tier);
  const currency = parseCurrency(body.currency);
  const userEmail = body.userEmail?.trim();
  if (!tier || !currency || !userEmail) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const wireRequest = await createWireRequest(db, {
      userId,
      userEmail,
      displayName: body.displayName?.trim(),
      tier,
      currency,
      locale: body.locale?.trim(),
    });
    void sendWireRequestNotification(wireRequest, "created").catch(() => undefined);
    void sendWirePaymentInstructionsEmail({
      userEmail,
      displayName: body.displayName?.trim(),
      userId,
      tier,
      currency,
      amount: wireRequest.amount,
      transferMemo: wireRequest.transferMemo,
      reference: wireRequest.reference,
      periodMonth: wireRequest.periodMonth,
      locale: body.locale?.trim(),
    }).catch(() => undefined);
    return NextResponse.json({
      request: wireRequest,
      bank: getWireBankDetailsForCurrency(currency),
      banks: {
        mxn: getWireBankDetailsMx(),
        eur: getWireBankDetailsSepa(),
      },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "create_failed", detail }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const userId = await verifyBearerUserId(request.headers.get("Authorization"));
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  let body: { requestId?: string; userNote?: string; currency?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const requestId = body.requestId?.trim();
  if (!requestId) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const currency = parseCurrency(body.currency);

  try {
    if (currency) {
      const updated = await updatePendingWireRequestCurrency(
        db,
        requestId,
        userId,
        currency,
      );
      if (!updated) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      return NextResponse.json({
        request: updated,
        bank: getWireBankDetailsForCurrency(currency),
        banks: {
          mxn: getWireBankDetailsMx(),
          eur: getWireBankDetailsSepa(),
        },
      });
    }

    const result = await markWireRequestSent(db, requestId, userId, body.userNote);
    if (!result) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (result.newlyMarked) {
      void sendWireRequestNotification(result.row, "wire_sent").catch(() => undefined);
    }
    return NextResponse.json({ request: result.row });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "update_failed", detail }, { status: 500 });
  }
}
