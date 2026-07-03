import {
  adminUpdateBillingInvoice,
  listRecentBillingInvoices,
} from "@/lib/admin/billing-invoices-admin.server";
import { isBillingInvoiceStatus } from "@/lib/billing/wire-billing";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin.server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  try {
    const invoices = await listRecentBillingInvoices(db);
    return NextResponse.json({ invoices });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "load_failed", detail }, { status: 500 });
  }
}

type PatchBody = {
  userId?: string;
  invoiceId?: string;
  status?: string;
  amount?: number;
  memoReference?: string;
  invoiceBody?: string;
  emailSubject?: string;
  emailBody?: string;
  scheduledSendAt?: string | null;
  customerEmail?: string;
  customerName?: string;
  action?: "regenerate_template" | "send_now" | "mark_paid" | "mark_follow_up";
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
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const userId = body.userId?.trim();
  const invoiceId = body.invoiceId?.trim();
  if (!userId || !invoiceId) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (body.status && !isBillingInvoiceStatus(body.status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  try {
    const { invoice, sendError } = await adminUpdateBillingInvoice(db, userId, invoiceId, {
      status:
        body.status && isBillingInvoiceStatus(body.status) ? body.status : undefined,
      amount: body.amount,
      memoReference: body.memoReference,
      invoiceBody: body.invoiceBody,
      emailSubject: body.emailSubject,
      emailBody: body.emailBody,
      scheduledSendAt: body.scheduledSendAt,
      customerEmail: body.customerEmail,
      customerName: body.customerName,
      action: body.action,
    });

    if (!invoice) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (sendError) {
      return NextResponse.json({ error: "send_failed", detail: sendError, invoice }, { status: 502 });
    }
    return NextResponse.json({ invoice });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "update_failed", detail }, { status: 500 });
  }
}
