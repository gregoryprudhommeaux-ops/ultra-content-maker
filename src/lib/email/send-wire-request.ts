import type { WireRequestRow } from "@/lib/billing/wire-requests.server";
import { getWireBankDetailsForCurrency } from "@/lib/billing/wire-config";
import { formatInvoiceAmount } from "@/lib/billing/wire-billing";

const RESEND_API = "https://api.resend.com/emails";

function adminEmail(): string {
  return (
    process.env.ADMIN_ERROR_REPORT_EMAIL?.trim() ||
    process.env.ADMIN_LOGIN_NOTIFY_EMAIL?.trim() ||
    "gregory.prudhommeaux@gmail.com"
  );
}

function fromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Ultra Content Maker <onboarding@resend.dev>"
  );
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://ultra-content-maker.vercel.app";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tierLabel(tier: WireRequestRow["tier"]): string {
  return tier === "pro" ? "Pro" : "Pro+";
}

function formatAmount(request: WireRequestRow): string {
  return formatInvoiceAmount(request.currency, request.amount);
}

function bankDetailsBlock(request: WireRequestRow): string {
  const bank = getWireBankDetailsForCurrency(request.currency);
  if (!bank.configured) return "";
  if (bank.rail === "mx_clabe") {
    return `<li>Compte : Mexico CLABE (${escapeHtml(bank.entity)}) · ${escapeHtml(bank.clabe)}</li>`;
  }
  return `<li>Compte : SEPA · ${escapeHtml(bank.bankName)} · ${escapeHtml(bank.iban)}</li>`;
}

function buildCreatedHtml(request: WireRequestRow): string {
  return `
<p><strong>Nouvelle demande de virement</strong> · Ultra Content Maker</p>
<ul>
  <li>Utilisateur : ${escapeHtml(request.displayName ?? request.userEmail)}</li>
  <li>E-mail : ${escapeHtml(request.userEmail)}</li>
  <li>UID : <code>${escapeHtml(request.userId)}</code></li>
  <li>Offre : ${escapeHtml(tierLabel(request.tier))}</li>
  <li>Locale : ${escapeHtml(request.locale ?? "—")}</li>
  <li>Montant : ${escapeHtml(formatAmount(request))}</li>
  <li>Période : ${escapeHtml(request.periodMonth)}</li>
  <li>Référence : <strong>${escapeHtml(request.reference)}</strong></li>
  <li>Libellé virement : <code>${escapeHtml(request.transferMemo)}</code></li>
  <li>Statut : ${escapeHtml(request.status)}</li>
  ${bankDetailsBlock(request)}
</ul>
<p>Le client n'a pas encore signalé l'envoi du virement.</p>
`.trim();
}

function buildWireSentHtml(request: WireRequestRow): string {
  const adminUrl = `${siteUrl()}/fr/admin/analytics`;

  return `
<p><strong>Action requise — virement signalé par le client</strong> · Ultra Content Maker</p>
<p>Un utilisateur indique avoir envoyé son virement. Vérifiez la réception sur le compte bancaire, puis activez son abonnement dans le cockpit admin.</p>
<ul>
  <li>Utilisateur : ${escapeHtml(request.displayName ?? request.userEmail)}</li>
  <li>E-mail : ${escapeHtml(request.userEmail)}</li>
  <li>UID : <code>${escapeHtml(request.userId)}</code></li>
  <li>Offre : ${escapeHtml(tierLabel(request.tier))}</li>
  <li>Locale : ${escapeHtml(request.locale ?? "—")}</li>
  <li>Montant attendu : <strong>${escapeHtml(formatAmount(request))}</strong></li>
  <li>Période : ${escapeHtml(request.periodMonth)}</li>
  <li>Référence : <strong>${escapeHtml(request.reference)}</strong></li>
  <li>Libellé / mémo virement : <code>${escapeHtml(request.transferMemo)}</code></li>
  ${bankDetailsBlock(request)}
  ${request.userNote ? `<li>Note client : ${escapeHtml(request.userNote)}</li>` : ""}
</ul>
<ol>
  <li>Vérifiez que le virement est bien arrivé sur le compte (montant, référence, libellé).</li>
  <li>Si tout est correct, approuvez la demande dans <strong>Cockpit admin → Virements en attente</strong>.</li>
</ol>
<p><a href="${escapeHtml(adminUrl)}"><strong>Ouvrir le cockpit admin · Virements en attente</strong></a></p>
`.trim();
}

export async function sendWireRequestNotification(
  request: WireRequestRow,
  event: "created" | "wire_sent",
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return;

  const subject =
    event === "wire_sent"
      ? `[UCM] Virement signalé — vérifier et activer · ${request.reference}`
      : `[UCM] Nouvelle demande de virement · ${request.reference}`;

  const html =
    event === "wire_sent" ? buildWireSentHtml(request) : buildCreatedHtml(request);

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [adminEmail()],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}
