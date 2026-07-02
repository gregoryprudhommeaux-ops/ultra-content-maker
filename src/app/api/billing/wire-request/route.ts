import {
  createWireRequest,
  findOpenWireRequest,
  listWireRequestsForUser,
  markWireRequestSent,
} from "@/lib/billing/wire-requests.server";
import { getWireBankDetails } from "@/lib/billing/wire-config";
import type { WirePlan } from "@/lib/billing/wire-config";
import { sendWireRequestNotification } from "@/lib/email/send-wire-request";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseTier(raw: unknown): WirePlan | null {
  return raw === "pro" || raw === "pro_plus" ? raw : null;
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
  const bank = getWireBankDetails();

  try {
    if (tier) {
      const open = await findOpenWireRequest(db, userId, tier);
      return NextResponse.json({ request: open, bank });
    }
    const requests = await listWireRequestsForUser(db, userId);
    return NextResponse.json({ requests, bank });
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

  let body: { tier?: string; userEmail?: string; displayName?: string; locale?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const tier = parseTier(body.tier);
  const userEmail = body.userEmail?.trim();
  if (!tier || !userEmail) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const wireRequest = await createWireRequest(db, {
      userId,
      userEmail,
      displayName: body.displayName?.trim(),
      tier,
      locale: body.locale?.trim(),
    });
    void sendWireRequestNotification(wireRequest, "created").catch(() => undefined);
    return NextResponse.json({ request: wireRequest, bank: getWireBankDetails() });
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

  let body: { requestId?: string; userNote?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const requestId = body.requestId?.trim();
  if (!requestId) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const updated = await markWireRequestSent(db, requestId, userId, body.userNote);
    if (!updated) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    void sendWireRequestNotification(updated, "wire_sent").catch(() => undefined);
    return NextResponse.json({ request: updated });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "update_failed", detail }, { status: 500 });
  }
}
