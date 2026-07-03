import type { WireBankDetails } from "@/lib/billing/wire-config";
import { buildWireTransferMemo, getWireBankDetailsForCurrency } from "@/lib/billing/wire-config";
import type { BillingInvoiceRow } from "@/lib/billing/wire-billing";
import { formatInvoiceAmount } from "@/lib/billing/wire-billing";
import type { WirePaymentCurrency } from "@/lib/billing/wire-pricing";
import type { WirePlan } from "@/lib/billing/wire-config.types";

const RESEND_API = "https://api.resend.com/emails";

type EmailLocale = "fr" | "en" | "es";

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

function resolveLocale(raw?: string | null): EmailLocale {
  if (raw === "en" || raw === "es") return raw;
  return "fr";
}

function tierLabel(tier: WirePlan, locale: EmailLocale): string {
  if (locale === "es") return tier === "pro" ? "Pro" : "Pro+";
  if (locale === "en") return tier === "pro" ? "Pro" : "Pro+";
  return tier === "pro" ? "Pro" : "Pro+";
}

function formatPeriodMonth(monthKey: string, locale: EmailLocale): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return monthKey;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  const tag = locale === "es" ? "es-ES" : locale === "en" ? "en-GB" : "fr-FR";
  return new Intl.DateTimeFormat(tag, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    d,
  );
}

function bankDetailsHtml(bank: WireBankDetails, locale: EmailLocale): string {
  if (!bank.configured) {
    return locale === "es"
      ? "<p>Coordenadas bancarias no configuradas — contacta soporte.</p>"
      : locale === "en"
        ? "<p>Bank details not configured — contact support.</p>"
        : "<p>Coordonnées bancaires non configurées — contactez le support.</p>";
  }

  if (bank.rail === "mx_clabe") {
    return `
<ul>
  <li>${locale === "es" ? "Entidad" : locale === "en" ? "Entity" : "Entité"}: ${escapeHtml(bank.entity)}</li>
  <li>CLABE: <code>${escapeHtml(bank.clabe)}</code></li>
  ${bank.accountNumber ? `<li>${locale === "es" ? "Cuenta" : locale === "en" ? "Account" : "Compte"}: ${escapeHtml(bank.accountNumber)}</li>` : ""}
  <li>${locale === "es" ? "Titular" : locale === "en" ? "Holder" : "Titulaire"}: ${escapeHtml(bank.accountHolder)}</li>
</ul>`;
  }

  return `
<ul>
  <li>${locale === "es" ? "Titular" : locale === "en" ? "Holder" : "Titulaire"}: ${escapeHtml(bank.accountHolder)}</li>
  <li>IBAN: <code>${escapeHtml(bank.iban)}</code></li>
  <li>BIC: ${escapeHtml(bank.bic)}</li>
  ${bank.bankName ? `<li>${locale === "es" ? "Banco" : locale === "en" ? "Bank" : "Banque"}: ${escapeHtml(bank.bankName)}</li>` : ""}
</ul>`;
}

function memoInstructions(locale: EmailLocale): string {
  if (locale === "es") {
    return "Incluye en el concepto de la transferencia: <strong>tu nombre + identificador de usuario</strong> (además de la referencia indicada).";
  }
  if (locale === "en") {
    return "Include in the transfer memo: <strong>your name + user ID</strong> (in addition to the reference below).";
  }
  return "Indiquez dans le libellé du virement : <strong>votre nom + identifiant utilisateur</strong> (en plus de la référence ci-dessous).";
}

function buildPaymentEmailHtml(input: {
  locale: EmailLocale;
  displayName?: string;
  userId: string;
  tier: WirePlan;
  currency: WirePaymentCurrency;
  amount: number;
  transferMemo: string;
  reference: string;
  periodMonth?: string;
  isRenewal: boolean;
}): { subject: string; html: string } {
  const bank = getWireBankDetailsForCurrency(input.currency);
  const amountLabel = formatInvoiceAmount(input.currency, input.amount);
  const plan = tierLabel(input.tier, input.locale);
  const period = input.periodMonth ? formatPeriodMonth(input.periodMonth, input.locale) : null;

  const subject =
    input.locale === "es"
      ? input.isRenewal
        ? `Renovación Ultra Content Maker · ${plan} · ${amountLabel}`
        : `Instrucciones de pago · Ultra Content Maker ${plan}`
      : input.locale === "en"
        ? input.isRenewal
          ? `Ultra Content Maker renewal · ${plan} · ${amountLabel}`
          : `Payment instructions · Ultra Content Maker ${plan}`
        : input.isRenewal
          ? `Renouvellement Ultra Content Maker · ${plan} · ${amountLabel}`
          : `Instructions de paiement · Ultra Content Maker ${plan}`;

  const greeting =
    input.locale === "es"
      ? `Hola${input.displayName ? ` ${escapeHtml(input.displayName)}` : ""},`
      : input.locale === "en"
        ? `Hello${input.displayName ? ` ${escapeHtml(input.displayName)}` : ""},`
        : `Bonjour${input.displayName ? ` ${escapeHtml(input.displayName)}` : ""},`;

  const intro =
    input.locale === "es"
      ? input.isRenewal
        ? `Tu suscripción ${plan} se renueva el 1 de ${period ?? "el próximo mes"}. Realiza la transferencia antes del fin de mes.`
        : `Para activar tu plan ${plan}, realiza una transferencia bancaria con los datos siguientes.`
      : input.locale === "en"
        ? input.isRenewal
          ? `Your ${plan} subscription renews on the 1st of ${period ?? "next month"}. Please send your wire before month end.`
          : `To activate your ${plan} plan, please send a bank transfer using the details below.`
        : input.isRenewal
          ? `Votre abonnement ${plan} se renouvelle le 1er ${period ? `de ${period}` : "du mois prochain"}. Merci d'effectuer le virement avant la fin du mois.`
          : `Pour activer votre offre ${plan}, effectuez un virement avec les coordonnées ci-dessous.`;

  const graceNote =
    input.locale === "es"
      ? "Tras el fin de cobertura, dispones de 7 días de gracia antes de la suspensión de la cuenta."
      : input.locale === "en"
        ? "After coverage ends, you have a 7-day grace period before your account is suspended."
        : "Après la fin de couverture, vous disposez de 7 jours de grâce avant suspension du compte.";

  const html = `
<p>${greeting}</p>
<p>${intro}</p>
<p><strong>${input.locale === "es" ? "Importe" : input.locale === "en" ? "Amount" : "Montant"}:</strong> ${escapeHtml(amountLabel)}</p>
<p>${memoInstructions(input.locale)}</p>
<p><strong>${input.locale === "es" ? "Concepto / referencia" : input.locale === "en" ? "Memo / reference" : "Libellé / référence"}:</strong><br/>
<code>${escapeHtml(input.transferMemo)}</code></p>
<p><strong>UID:</strong> <code>${escapeHtml(input.userId)}</code></p>
<h3>${input.locale === "es" ? "Datos bancarios" : input.locale === "en" ? "Bank details" : "Coordonnées bancaires"} (${input.currency.toUpperCase()})</h3>
${bankDetailsHtml(bank, input.locale)}
<p style="margin-top:1.5em;font-size:0.9em;color:#555">${graceNote}</p>
<p style="font-size:0.85em;color:#777">Ultra Content Maker</p>
`;

  return { subject, html };
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return;

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
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}

export async function sendWirePaymentInstructionsEmail(input: {
  userEmail: string;
  displayName?: string;
  userId: string;
  tier: WirePlan;
  currency: WirePaymentCurrency;
  amount: number;
  transferMemo: string;
  reference: string;
  periodMonth?: string;
  locale?: string | null;
}): Promise<void> {
  const locale = resolveLocale(input.locale);
  const { subject, html } = buildPaymentEmailHtml({ ...input, locale, isRenewal: false });
  await sendEmail(input.userEmail, subject, html);
}

export async function sendWireRenewalReminderEmail(input: {
  userEmail: string;
  displayName?: string;
  userId: string;
  tier: WirePlan;
  currency: WirePaymentCurrency;
  invoice: BillingInvoiceRow;
  locale?: string | null;
}): Promise<void> {
  const locale = resolveLocale(input.locale);
  const transferMemo = buildWireTransferMemo({
    userId: input.userId,
    tier: input.tier,
    displayName: input.displayName,
  });
  const { subject, html } = buildPaymentEmailHtml({
    locale,
    displayName: input.displayName,
    userId: input.userId,
    tier: input.tier,
    currency: input.currency,
    amount: input.invoice.amount,
    transferMemo,
    reference: input.invoice.memoReference,
    periodMonth: input.invoice.periodMonth,
    isRenewal: true,
  });
  await sendEmail(input.userEmail, subject, html);
}
