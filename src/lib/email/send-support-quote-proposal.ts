import type { SupportQuoteProposalDraft } from "@/lib/admin/support-quote-proposal";
import { clientLocaleForQuote, proposalContentForLocale } from "@/lib/admin/support-quote-proposal";
import type { SupportQuoteRow } from "@/lib/admin/support-quotes.server";

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

export async function sendSupportQuoteProposalEmail(input: {
  quote: Pick<SupportQuoteRow, "email" | "fullName" | "locale">;
  proposal: SupportQuoteProposalDraft;
  localeOverride?: "fr" | "en" | "es";
  emailSubject?: string;
  emailBody?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "resend_not_configured" };

  const to = input.quote.email.trim();
  if (!to) return { ok: false, error: "missing_client_email" };

  const locale = input.localeOverride ?? clientLocaleForQuote(input.quote);
  const content = proposalContentForLocale(input.proposal, locale);
  const subject = input.emailSubject?.trim() || content.subject;
  const bodyText = input.emailBody?.trim() || content.body;

  const html = `
<div style="font-family:system-ui,sans-serif;line-height:1.55;color:#1e293b;max-width:640px">
  <p style="margin:0 0 16px;font-size:15px;white-space:pre-wrap">${textToHtml(bodyText)}</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
  <p style="margin:0;font-size:12px;color:#64748b">Ultra Content Maker · Support Total</p>
</div>`;

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
