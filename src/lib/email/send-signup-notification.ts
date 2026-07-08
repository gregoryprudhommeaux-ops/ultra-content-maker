const RESEND_API = "https://api.resend.com/emails";

export type SignupNotifyPayload = {
  userEmail: string;
  displayName?: string;
  userId: string;
  method: "email" | "google";
  locale?: string;
};

function adminSignupNotifyEmail(): string {
  return (
    process.env.ADMIN_SIGNUP_NOTIFY_EMAIL?.trim() ||
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

function buildHtml(payload: SignupNotifyPayload): string {
  const name = payload.displayName?.trim() || "-";
  const methodLabel =
    payload.method === "google" ? "Google" : "E-mail / mot de passe";
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://ultra-content-maker.vercel.app";

  return `
<p><strong>Nouveau compte</strong> sur Ultra Content Maker</p>
<ul>
<li><strong>E-mail :</strong> ${escapeHtml(payload.userEmail)}</li>
<li><strong>Nom affiché :</strong> ${escapeHtml(name)}</li>
<li><strong>UID Firebase :</strong> ${escapeHtml(payload.userId)}</li>
<li><strong>Méthode :</strong> ${methodLabel}</li>
<li><strong>Langue UI :</strong> ${escapeHtml(payload.locale ?? "-")}</li>
<li><strong>Heure (UTC) :</strong> ${new Date().toISOString()}</li>
</ul>
<p><a href="${escapeHtml(site)}">${escapeHtml(site)}</a></p>
`.trim();
}

export function isSignupNotifyConfigured(): boolean {
  return !!process.env.RESEND_API_KEY?.trim();
}

export async function sendSignupNotificationEmail(
  payload: SignupNotifyPayload,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const subject = `[UCM] Nouveau compte · ${payload.userEmail}`;

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [adminSignupNotifyEmail()],
      subject,
      html: buildHtml(payload),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}
