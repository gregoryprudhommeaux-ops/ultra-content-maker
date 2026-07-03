import type { Firestore } from "firebase-admin/firestore";
import {
  getBillingInvoice,
  mapBillingInvoice,
  markInvoicePaid,
  markInvoiceSent,
  regenerateInvoiceTemplates,
  updateBillingInvoice,
} from "@/lib/billing/invoices.server";
import type { BillingInvoiceRow, BillingInvoiceStatus } from "@/lib/billing/wire-billing";
import { isBillingInvoiceStatus } from "@/lib/billing/wire-billing";
import { sendBillingInvoiceEmail } from "@/lib/email/send-invoice-email";

/** Recent invoices across all users (admin cockpit). */
export async function listRecentBillingInvoices(
  db: Firestore,
  limit = 80,
): Promise<BillingInvoiceRow[]> {
  const mapDocs = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) =>
    docs.map((doc) => {
      const userId = doc.ref.parent.parent?.id ?? "";
      return mapBillingInvoice(doc.id, doc.data(), userId);
    });

  try {
    const snap = await db
      .collectionGroup("billingInvoices")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return mapDocs(snap.docs);
  } catch {
    const snap = await db.collectionGroup("billingInvoices").get();
    return mapDocs(snap.docs)
      .sort((a, b) => {
        const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bTime - aTime;
      })
      .slice(0, limit);
  }
}

export async function adminUpdateBillingInvoice(
  db: Firestore,
  userId: string,
  invoiceId: string,
  input: {
    status?: BillingInvoiceStatus;
    amount?: number;
    memoReference?: string;
    invoiceBody?: string;
    emailSubject?: string;
    emailBody?: string;
    scheduledSendAt?: string | null;
    customerEmail?: string;
    customerName?: string;
    action?: "regenerate_template" | "send_now" | "mark_paid" | "mark_follow_up";
  },
): Promise<{ invoice: BillingInvoiceRow | null; sendError?: string }> {
  if (input.action === "regenerate_template") {
    const current = await getBillingInvoice(db, userId, invoiceId);
    if (!current) return { invoice: null };
    const templates = regenerateInvoiceTemplates(current);
    const invoice = await updateBillingInvoice(db, userId, invoiceId, templates);
    return { invoice };
  }

  if (input.action === "mark_paid") {
    const invoice = await markInvoicePaid(db, userId, invoiceId);
    return { invoice };
  }

  if (input.action === "mark_follow_up") {
    const invoice = await updateBillingInvoice(db, userId, invoiceId, {
      status: "follow_up",
    });
    return { invoice };
  }

  const patch = { ...input };
  delete (patch as { action?: string }).action;
  if (patch.status && !isBillingInvoiceStatus(patch.status)) {
    return { invoice: null };
  }

  let invoice = await updateBillingInvoice(db, userId, invoiceId, patch);

  if (input.action === "send_now" && invoice) {
    const send = await sendBillingInvoiceEmail(invoice, {
      emailSubject: invoice.emailSubject,
      emailBody: invoice.emailBody,
      toEmail: invoice.customerEmail,
    });
    if (!send.ok) return { invoice, sendError: send.error };
    invoice = await markInvoiceSent(db, userId, invoiceId);
  }

  return { invoice };
}

export async function dispatchScheduledInvoices(
  db: Firestore,
  now = new Date(),
): Promise<{ sent: number; errors: number }> {
  const snap = await db.collectionGroup("billingInvoices").get();
  let sent = 0;
  let errors = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.status !== "ready_to_send") continue;
    const scheduled = data.scheduledSendAt ? String(data.scheduledSendAt) : "";
    if (!scheduled) continue;
    const when = new Date(scheduled);
    if (Number.isNaN(when.getTime()) || when.getTime() > now.getTime()) continue;

    const userId = doc.ref.parent.parent?.id ?? "";
    const invoice = mapBillingInvoice(doc.id, data, userId);
    const result = await sendBillingInvoiceEmail(invoice);
    if (!result.ok) {
      errors += 1;
      continue;
    }
    await markInvoiceSent(db, userId, doc.id);
    sent += 1;
  }

  return { sent, errors };
}
