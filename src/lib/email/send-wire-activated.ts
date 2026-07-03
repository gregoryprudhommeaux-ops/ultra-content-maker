import type { WireRequestRow } from "@/lib/billing/wire-requests.server";
import { isContentLanguage } from "@/lib/billing/wire-config";

const RESEND_API = "https://api.resend.com/emails";

type UserLocale = "fr" | "en" | "es";

function fromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Ultra Content Maker <onboarding@resend.dev>"
  );
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://ultra-content-maker.vercel.app";
}

function resolveLocale(locale?: string): UserLocale {
  if (isContentLanguage(locale)) return locale;
  return "fr";
}

function tierName(tier: WireRequestRow["tier"]): string {
  return tier === "pro" ? "Pro" : "Pro+";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const COPY: Record<
  UserLocale,
  {
    subject: (tier: string) => string;
    title: string;
    greeting: (name: string) => string;
    body: (tier: string) => string;
    cta: string;
    footer: string;
  }
> = {
  fr: {
    subject: (tier) => `[UCM] Votre abonnement ${tier} est actif`,
    title: "Votre compte est activé",
    greeting: (name) => `Bonjour ${name},`,
    body: (tier) =>
      `Bonne nouvelle : votre abonnement ${tier} est maintenant actif. Vous pouvez profiter de toutes les fonctionnalités incluses dans votre offre.`,
    cta: "Accéder à Ultra Content Maker",
    footer: "Merci pour votre confiance. À très vite sur la plateforme !",
  },
  en: {
    subject: (tier) => `[UCM] Your ${tier} plan is now active`,
    title: "Your account is active",
    greeting: (name) => `Hi ${name},`,
    body: (tier) =>
      `Great news: your ${tier} subscription is now active. You can start using all features included in your plan.`,
    cta: "Go to Ultra Content Maker",
    footer: "Thank you for your trust. See you on the platform!",
  },
  es: {
    subject: (tier) => `[UCM] Tu plan ${tier} ya está activo`,
    title: "Tu cuenta está activa",
    greeting: (name) => `Hola ${name},`,
    body: (tier) =>
      `Buenas noticias: tu suscripción ${tier} ya está activa. Puedes empezar a usar todas las funciones incluidas en tu plan.`,
    cta: "Ir a Ultra Content Maker",
    footer: "Gracias por tu confianza. ¡Nos vemos en la plataforma!",
  },
};

function buildHtml(request: WireRequestRow, locale: UserLocale): string {
  const tier = tierName(request.tier);
  const copy = COPY[locale];
  const name = request.displayName?.trim() || request.userEmail;
  const appUrl = `${siteUrl()}/${locale}`;

  return `
<p><strong>${escapeHtml(copy.title)}</strong> · Ultra Content Maker</p>
<p>${escapeHtml(copy.greeting(name))}</p>
<p>${escapeHtml(copy.body(tier))}</p>
<p><a href="${escapeHtml(appUrl)}"><strong>${escapeHtml(copy.cta)}</strong></a></p>
<p>${escapeHtml(copy.footer)}</p>
`.trim();
}

export async function sendWireActivatedEmail(request: WireRequestRow): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return;

  const locale = resolveLocale(request.locale);
  const tier = tierName(request.tier);
  const copy = COPY[locale];

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [request.userEmail],
      subject: copy.subject(tier),
      html: buildHtml(request, locale),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}
