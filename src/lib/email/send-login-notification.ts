const RESEND_API = "https://api.resend.com/emails";

export type LoginNotifyPayload = {
 userEmail: string;
 displayName?: string;
 userId: string;
 method: "email" | "google";
 event: "login" | "signup";
 locale?: string;
};

function adminNotifyEmail(): string {
 return (
 process.env.ADMIN_LOGIN_NOTIFY_EMAIL?.trim() || "gregory.prudhommeaux@gmail.com"
 );
}

function fromAddress(): string {
 return (
 process.env.RESEND_FROM_EMAIL?.trim() ||
 "Ultra Content Maker <onboarding@resend.dev>"
 );
}

function buildHtml(payload: LoginNotifyPayload): string {
 const name = payload.displayName?.trim() || "-";
 const eventLabel = payload.event === "signup" ? "Inscription" : "Connexion";
 const methodLabel = payload.method === "google" ? "Google" : "E-mail / mot de passe";
 const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://ultra-content-maker.vercel.app";

 return `
 <p><strong>${eventLabel}</strong> sur Ultra Content Maker</p>
 <ul>
 <li><strong>E-mail utilisateur :</strong> ${escapeHtml(payload.userEmail)}</li>
 <li><strong>Nom affiché :</strong> ${escapeHtml(name)}</li>
 <li><strong>UID Firebase :</strong> ${escapeHtml(payload.userId)}</li>
 <li><strong>Méthode :</strong> ${methodLabel}</li>
 <li><strong>Langue UI :</strong> ${escapeHtml(payload.locale ?? "-")}</li>
 <li><strong>Heure (UTC) :</strong> ${new Date().toISOString()}</li>
 </ul>
 <p><a href="${escapeHtml(site)}">${escapeHtml(site)}</a></p>
 `.trim();
}

function escapeHtml(value: string): string {
 return value
 .replace(/&/g, "&amp;")
 .replace(/</g, "&lt;")
 .replace(/>/g, "&gt;")
 .replace(/"/g, "&quot;");
}

export function isLoginNotifyConfigured(): boolean {
 return !!process.env.RESEND_API_KEY?.trim();
}

export async function sendLoginNotificationEmail(
 payload: LoginNotifyPayload,
): Promise<void> {
 const apiKey = process.env.RESEND_API_KEY?.trim();
 if (!apiKey) {
 throw new Error("RESEND_API_KEY not configured");
 }

 const eventLabel = payload.event === "signup" ? "Inscription" : "Connexion";
 const subject = `[UCM] ${eventLabel} · ${payload.userEmail}`;

 const res = await fetch(RESEND_API, {
 method: "POST",
 headers: {
 Authorization: `Bearer ${apiKey}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 from: fromAddress(),
 to: [adminNotifyEmail()],
 subject,
 html: buildHtml(payload),
 }),
 });

 if (!res.ok) {
 const detail = await res.text().catch(() => "");
 throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
 }
}
