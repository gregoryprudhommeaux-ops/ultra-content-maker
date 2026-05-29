import { extractProviderErrorMessage } from "@/lib/llm/provider-errors";

const RESEND_API = "https://api.resend.com/emails";

export type ErrorReportPayload = {
  userId: string;
  userEmail: string;
  displayName?: string;
  surface: string;
  userMessage: string;
  errorCode?: string;
  detail?: string;
  userNote?: string;
  locale?: string;
  pageUrl?: string;
  userAgent?: string;
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

function buildHtml(payload: ErrorReportPayload): string {
  const providerDetail = payload.detail
    ? extractProviderErrorMessage(payload.detail)
  : "—";
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://ultra-content-maker.vercel.app";

  return `
    <p><strong>Signalement d'erreur</strong> — Ultra Content Maker</p>
    <ul>
      <li><strong>Zone :</strong> ${escapeHtml(payload.surface)}</li>
      <li><strong>Message affiché :</strong> ${escapeHtml(payload.userMessage)}</li>
      <li><strong>Code erreur :</strong> ${escapeHtml(payload.errorCode ?? "—")}</li>
      <li><strong>E-mail utilisateur :</strong> ${escapeHtml(payload.userEmail)}</li>
      <li><strong>Nom :</strong> ${escapeHtml(payload.displayName?.trim() || "—")}</li>
      <li><strong>UID :</strong> ${escapeHtml(payload.userId)}</li>
      <li><strong>Langue UI :</strong> ${escapeHtml(payload.locale ?? "—")}</li>
      <li><strong>Page :</strong> ${escapeHtml(payload.pageUrl ?? "—")}</li>
      <li><strong>Heure (UTC) :</strong> ${new Date().toISOString()}</li>
    </ul>
    ${
      payload.userNote?.trim()
        ? `<p><strong>Note de l'utilisateur :</strong><br/>${escapeHtml(payload.userNote.trim())}</p>`
        : ""
    }
    <p><strong>Détail technique (extrait) :</strong></p>
    <pre style="white-space:pre-wrap;font-size:12px;background:#f4f4f5;padding:12px;border-radius:8px;">${escapeHtml(
      providerDetail.slice(0, 4000),
    )}</pre>
    ${
      payload.detail && payload.detail !== providerDetail
        ? `<p><strong>Brut :</strong></p><pre style="white-space:pre-wrap;font-size:11px;background:#f4f4f5;padding:12px;border-radius:8px;">${escapeHtml(
            payload.detail.slice(0, 4000),
          )}</pre>`
        : ""
    }
    <p><strong>User-Agent :</strong> ${escapeHtml((payload.userAgent ?? "—").slice(0, 500))}</p>
    <p><a href="${escapeHtml(site)}">${escapeHtml(site)}</a></p>
  `.trim();
}

export function isErrorReportConfigured(): boolean {
  return !!process.env.RESEND_API_KEY?.trim();
}

export async function sendErrorReportEmail(payload: ErrorReportPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");

  const subject = `[UCM] Erreur — ${payload.surface} — ${payload.userEmail}`;

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
      html: buildHtml(payload),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}
