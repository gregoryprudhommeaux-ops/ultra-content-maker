import { formatInvoiceAmount } from "@/lib/billing/wire-billing";
import type { WirePaymentCurrency } from "@/lib/billing/wire-pricing";
import { isContentLanguage } from "@/lib/billing/wire-config";
import { WIRE_GRACE_DAYS } from "@/lib/billing/wire-pricing";

const RESEND_API = "https://api.resend.com/emails";

export type WireGraceReminderPayload = {
  userEmail: string;
  displayName?: string;
  currency: WirePaymentCurrency;
  amount: number;
  transferMemo: string;
  graceEndsAt: string;
  locale?: string;
};

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

function copy(locale: string, payload: WireGraceReminderPayload) {
  const amount = formatInvoiceAmount(payload.currency, payload.amount);
  const name = payload.displayName?.trim() || payload.userEmail;
  const graceDate = new Date(payload.graceEndsAt).toLocaleDateString(
    locale === "es" ? "es-ES" : locale === "en" ? "en-GB" : "fr-FR",
    { dateStyle: "long", timeZone: "UTC" },
  );

  if (locale === "es") {
    return {
      subject: `[UCM] Pago pendiente · acceso suspendido el ${graceDate}`,
      html: `
<p>Hola ${escapeHtml(name)},</p>
<p>Tu periodo de pago ha terminado. Tienes <strong>${WIRE_GRACE_DAYS} días</strong> de gracia (hasta el ${escapeHtml(graceDate)}) para renovar por transferencia.</p>
<ul>
  <li>Importe: ${escapeHtml(amount)}</li>
  <li>Concepto: ${escapeHtml(payload.transferMemo)}</li>
</ul>
<p>Si no recibimos el pago, tu acceso se suspenderá automáticamente.</p>
<p>— Ultra Content Maker</p>
`.trim(),
    };
  }

  if (locale === "en") {
    return {
      subject: `[UCM] Payment overdue · access suspended on ${graceDate}`,
      html: `
<p>Hi ${escapeHtml(name)},</p>
<p>Your paid period has ended. You have <strong>${WIRE_GRACE_DAYS} days</strong> of grace (until ${escapeHtml(graceDate)}) to renew by wire transfer.</p>
<ul>
  <li>Amount: ${escapeHtml(amount)}</li>
  <li>Memo: ${escapeHtml(payload.transferMemo)}</li>
</ul>
<p>Without payment, your access will be suspended automatically.</p>
<p>— Ultra Content Maker</p>
`.trim(),
    };
  }

  return {
    subject: `[UCM] Paiement en retard · suspension le ${graceDate}`,
    html: `
<p>Bonjour ${escapeHtml(name)},</p>
<p>Votre période payée est terminée. Vous disposez de <strong>${WIRE_GRACE_DAYS} jours</strong> de grâce (jusqu'au ${escapeHtml(graceDate)}) pour renouveler par virement.</p>
<ul>
  <li>Montant : ${escapeHtml(amount)}</li>
  <li>Libellé : ${escapeHtml(payload.transferMemo)}</li>
</ul>
<p>Sans paiement, votre accès sera suspendu automatiquement.</p>
<p>— Ultra Content Maker</p>
`.trim(),
  };
}

export async function sendWireGraceReminderEmail(
  payload: WireGraceReminderPayload,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return;

  const locale = isContentLanguage(payload.locale) ? payload.locale : "fr";
  const { subject, html } = copy(locale, payload);

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [payload.userEmail],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}
