import { listBillingInvoicesForUser } from "@/lib/billing/invoices.server";
import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await verifyBearerUserId(request.headers.get("Authorization"));
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  try {
    const invoices = await listBillingInvoicesForUser(db, userId);
    return NextResponse.json({ invoices });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "load_failed", detail }, { status: 500 });
  }
}
