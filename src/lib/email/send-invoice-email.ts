import type { BillingInvoiceRow } from "@/lib/billing/wire-billing";
import { hydrateInvoiceTemplates } from "@/lib/billing/invoice-template";

const RESEND_API = "https://api.resend.com/emails";

function fromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Ultra Content Maker <onboarding@resend.dev>"
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, "<br />");
}

export async function sendBillingInvoiceEmail(
  invoice: BillingInvoiceRow,
  overrides?: { emailSubject?: string; emailBody?: string; toEmail?: string },
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to =
    overrides?.toEmail?.trim() ||
    invoice.customerEmail?.trim() ||
    "";
  if (!apiKey) return { ok: false, error: "resend_not_configured" };
  if (!to) return { ok: false, error: "missing_customer_email" };

  const hydrated = hydrateInvoiceTemplates(invoice);
  const subject = overrides?.emailSubject?.trim() || hydrated.emailSubject || "Facture Ultra Content Maker";
  const bodyText = overrides?.emailBody?.trim() || hydrated.emailBody || "";
  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#1e293b">${textToHtml(bodyText)}</div>`;

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [to],
      subject,
      html,
      text: bodyText,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { ok: false, error: detail || `resend_${res.status}` };
  }
  return { ok: true };
}
