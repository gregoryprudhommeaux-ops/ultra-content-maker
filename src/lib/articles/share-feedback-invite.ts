import type { ContentLanguage } from "@/types/workspace";

type InviteCopy = { subject: string; body: (url: string, hookPreview: string) => string };

const INVITE: Record<"fr" | "en" | "es", InviteCopy> = {
  fr: {
    subject: "Relecture de votre brouillon LinkedIn — retours précis",
    body: (url, hookPreview) =>
      `Bonjour,

Voici un lien sécurisé pour relire votre brouillon de post LinkedIn et nous transmettre des retours précis :

${url}

Accroche : « ${hookPreview} »

Merci d’indiquer concrètement :
• Ce qui ne correspond pas à votre voix ou ton habituel
• Les faits ou formulations à corriger
• La longueur / structure (trop long, accroche faible, etc.)
• Tout exemple de reformulation qui vous ressemble davantage

Plus vos retours sont précis, mieux nous affinerons le texte final.

Merci,
L’équipe Ultra Content Maker`,
  },
  en: {
    subject: "Review your LinkedIn draft — specific feedback",
    body: (url, hookPreview) =>
      `Hello,

Here is a secure link to review your LinkedIn post draft and send us specific feedback:

${url}

Hook: "${hookPreview}"

Please share concrete notes on:
• What does not sound like your voice or usual tone
• Facts or wording to fix
• Length / structure (too long, weak hook, etc.)
• Example phrasing that feels more like you

The more precise your feedback, the better we can refine the final post.

Thank you,
The Ultra Content Maker team`,
  },
  es: {
    subject: "Revisión de tu borrador LinkedIn — comentarios precisos",
    body: (url, hookPreview) =>
      `Hola,

Aquí tienes un enlace seguro para revisar tu borrador de post de LinkedIn y enviarnos comentarios precisos:

${url}

Gancho: « ${hookPreview} »

Indica concretamente:
• Lo que no encaja con tu voz o tono habitual
• Hechos o formulaciones a corregir
• Longitud / estructura (demasiado largo, gancho débil, etc.)
• Ejemplos de redacción que te representen mejor

Cuanto más precisos sean tus comentarios, mejor podremos afinar el texto final.

Gracias,
El equipo Ultra Content Maker`,
  },
};

export function contentLanguageToInviteLocale(
  contentLanguage: ContentLanguage,
): "fr" | "en" | "es" {
  if (contentLanguage === "en-gb" || contentLanguage === "en-us") return "en";
  if (contentLanguage === "es" || contentLanguage === "es-mx") return "es";
  return "fr";
}

export function buildFeedbackInviteEmail(
  contentLanguage: ContentLanguage,
  reviewUrl: string,
  hookPreview: string,
): { subject: string; body: string } {
  const locale = contentLanguageToInviteLocale(contentLanguage);
  const copy = INVITE[locale];
  const hook =
    hookPreview.length > 80 ? `${hookPreview.slice(0, 77).trim()}…` : hookPreview || "…";
  return {
    subject: copy.subject,
    body: copy.body(reviewUrl, hook),
  };
}
