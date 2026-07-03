const RESEND_API = "https://api.resend.com/emails";

export type SupportQuotePlan = "starter" | "regular" | "much_more" | "unspecified";

export type SupportQuotePayload = {
  fullName: string;
  companyName: string;
  position: string;
  activityNeed: string;
  email: string;
  whatsapp: string;
  plan: SupportQuotePlan;
  locale?: string;
  pageUrl?: string;
  userId?: string;
};

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

function planLabel(plan: SupportQuotePlan): string {
  if (plan === "starter") return "Support Starter";
  if (plan === "regular") return "Support Régulier";
  if (plan === "much_more") return "Beaucoup Plus";
  return "Non précisé";
}

function buildHtml(payload: SupportQuotePayload): string {
  return `
<p><strong>Demande de devis · Support Total</strong> · Ultra Content Maker</p>
<ul>
<li><strong>Offre :</strong> ${escapeHtml(planLabel(payload.plan))}</li>
<li><strong>Nom :</strong> ${escapeHtml(payload.fullName)}</li>
<li><strong>Entreprise :</strong> ${escapeHtml(payload.companyName)}</li>
<li><strong>Poste :</strong> ${escapeHtml(payload.position)}</li>
<li><strong>Email :</strong> ${escapeHtml(payload.email)}</li>
<li><strong>WhatsApp :</strong> ${escapeHtml(payload.whatsapp)}</li>
<li><strong>Langue UI :</strong> ${escapeHtml(payload.locale ?? "-")}</li>
<li><strong>Page :</strong> ${escapeHtml(payload.pageUrl ?? "-")}</li>
<li><strong>UID :</strong> ${escapeHtml(payload.userId ?? "-")}</li>
<li><strong>Heure (UTC) :</strong> ${new Date().toISOString()}</li>
</ul>
<p><strong>Activité et besoin :</strong></p>
<p style="white-space:pre-wrap;">${escapeHtml(payload.activityNeed)}</p>
`.trim();
}

export function isSupportQuoteEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY?.trim();
}

export async function sendSupportQuoteEmail(payload: SupportQuotePayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");

  const subject = `[UCM] Devis Support · ${payload.companyName || payload.fullName}`;

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [adminEmail()],
      reply_to: payload.email,
      subject,
      html: buildHtml(payload),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}
