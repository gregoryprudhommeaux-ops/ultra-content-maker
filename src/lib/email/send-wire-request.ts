import type { WireRequestRow } from "@/lib/billing/wire-requests.server";

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tierLabel(tier: WireRequestRow["tier"]): string {
  return tier === "pro" ? "Pro ($19/mo)" : "Pro+ ($33/mo)";
}

export async function sendWireRequestNotification(
  request: WireRequestRow,
  event: "created" | "wire_sent",
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return;

  const title =
    event === "wire_sent"
      ? "Virement signalé · activation en attente"
      : "Nouvelle demande de virement";

  const html = `
<p><strong>${escapeHtml(title)}</strong> · Ultra Content Maker</p>
<ul>
  <li>Utilisateur : ${escapeHtml(request.displayName ?? request.userEmail)}</li>
  <li>E-mail : ${escapeHtml(request.userEmail)}</li>
  <li>UID : <code>${escapeHtml(request.userId)}</code></li>
  <li>Offre : ${escapeHtml(tierLabel(request.tier))}</li>
  <li>Montant : $${request.amountUsd} USD</li>
  <li>Référence : <strong>${escapeHtml(request.reference)}</strong></li>
  <li>Statut : ${escapeHtml(request.status)}</li>
  ${request.userNote ? `<li>Note : ${escapeHtml(request.userNote)}</li>` : ""}
</ul>
<p>Validez dans le cockpit admin → Virements en attente.</p>
`;

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [adminEmail()],
      subject: `[UCM] ${title} · ${request.reference}`,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}
