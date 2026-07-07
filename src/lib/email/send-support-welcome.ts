const RESEND_API = "https://api.resend.com/emails";

type WelcomeLocale = "fr" | "en" | "es";

function fromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Ultra Content Maker <onboarding@resend.dev>"
  );
}

function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://127.0.0.1:3000";
}

function resolveLocale(raw?: string | null): WelcomeLocale {
  if (raw === "en" || raw === "es") return raw;
  return "fr";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildContent(locale: WelcomeLocale, fullName: string, hasAccount: boolean): {
  subject: string;
  html: string;
  text: string;
} {
  const base = siteUrl();
  const name = fullName.trim();
  const greeting =
    locale === "en"
      ? `Hello${name ? ` ${name}` : ""},`
      : locale === "es"
        ? `Hola${name ? ` ${name}` : ""},`
        : `Bonjour${name ? ` ${name}` : ""},`;

  const thanks =
    locale === "en"
      ? "Thank you for signing our commercial proposal. Your Support Total contract is now active."
      : locale === "es"
        ? "Gracias por firmar nuestra propuesta comercial. Su contrato Support Total está activo."
        : "Merci d'avoir signé notre proposition commerciale. Votre contrat Support Total est activé.";

  const accountLine = hasAccount
    ? locale === "en"
      ? "Complete your author profile so we can align on your voice and LinkedIn publishing preferences:"
      : locale === "es"
        ? "Complete su perfil de autor para alinear su voz y preferencias de publicación en LinkedIn:"
        : "Complétez votre profil auteur pour aligner votre voix et vos préférences de publication LinkedIn :"
    : locale === "en"
      ? "Create your Ultra Content Maker account to access your workspace:"
      : locale === "es"
        ? "Cree su cuenta Ultra Content Maker para acceder a su espacio:"
        : "Créez votre compte Ultra Content Maker pour accéder à votre espace :";

  const ctaPath = hasAccount ? "/setup/author" : "/signup";
  const ctaLabel = hasAccount
    ? locale === "en"
      ? "Complete my profile"
      : locale === "es"
        ? "Completar mi perfil"
        : "Compléter mon profil"
    : locale === "en"
      ? "Create my account"
      : locale === "es"
        ? "Crear mi cuenta"
        : "Créer mon compte";

  const ctaUrl = `${base}/${locale}${ctaPath}`;

  const wire =
    locale === "en"
      ? "Your first monthly invoice will be sent by email. Payment is by bank transfer (wire) on receipt."
      : locale === "es"
        ? "Su primera factura mensual se enviará por correo. El pago es por transferencia bancaria a la recepción."
        : "Votre première facture mensuelle vous sera envoyée par e-mail. Le règlement s'effectue par virement bancaire à réception.";

  const closing =
    locale === "en"
      ? "Best regards,\nThe Ultra Content Maker team"
      : locale === "es"
        ? "Saludos cordiales,\nEl equipo Ultra Content Maker"
        : "Bien cordialement,\nL'équipe Ultra Content Maker";

  const subject =
    locale === "en"
      ? "Welcome to Support Total · Ultra Content Maker"
      : locale === "es"
        ? "Bienvenido a Support Total · Ultra Content Maker"
        : "Bienvenue dans le Support Total · Ultra Content Maker";

  const text = [greeting, "", thanks, "", accountLine, ctaUrl, "", wire, "", closing].join("\n");

  const html = `
<div style="font-family:system-ui,sans-serif;line-height:1.55;color:#1e293b;max-width:640px">
  <p style="margin:0 0 16px;font-size:15px">${escapeHtml(greeting)}</p>
  <p style="margin:0 0 16px;font-size:15px">${escapeHtml(thanks)}</p>
  <p style="margin:0 0 12px;font-size:15px">${escapeHtml(accountLine)}</p>
  <p style="margin:0 0 20px"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:12px 20px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">${escapeHtml(ctaLabel)}</a></p>
  <p style="margin:0 0 16px;font-size:14px;color:#475569">${escapeHtml(wire)}</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
  <p style="margin:0;font-size:12px;color:#64748b;white-space:pre-wrap">${escapeHtml(closing)}</p>
</div>`;

  return { subject, html, text };
}

export async function sendSupportWelcomeEmail(input: {
  email: string;
  fullName: string;
  locale?: string | null;
  hasAccount?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "resend_not_configured" };

  const to = input.email.trim();
  if (!to) return { ok: false, error: "missing_client_email" };

  const locale = resolveLocale(input.locale);
  const { subject, html, text } = buildContent(locale, input.fullName, Boolean(input.hasAccount));

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
      text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { ok: false, error: detail || `resend_${res.status}` };
  }
  return { ok: true };
}
