export type UcmTemplateLocale = "fr" | "en" | "es";

export const UCM_TEMPLATE_LOCALES: UcmTemplateLocale[] = ["fr", "en", "es"];

export const DEFAULT_UCM_TEMPLATE_LOCALE: UcmTemplateLocale = "fr";

export const SYSTEM_UCM_EMAIL_TEMPLATE_KEYS = [
  "signup_welcome",
  "weekly_content_ideas",
  "trial_ending_soon",
  "trial_expired",
  "first_post_nudge",
  "payment_failed",
  "inactivity_nudge",
] as const;

export type SystemUcmEmailTemplateKey =
  (typeof SYSTEM_UCM_EMAIL_TEMPLATE_KEYS)[number];

export type UcmEmailTemplateKey =
  | SystemUcmEmailTemplateKey
  | `custom_${string}`;

export type UcmEmailTemplateLocaleContent = {
  subject: string;
  body: string;
};

export type UcmEmailTemplateDoc = {
  key: UcmEmailTemplateKey;
  subject: string;
  body: string;
  locale?: UcmTemplateLocale;
  locales?: Partial<Record<UcmTemplateLocale, UcmEmailTemplateLocaleContent>>;
  enabled?: boolean;
  updatedAt?: string;
  label?: string;
  custom?: boolean;
};

export type UcmTemplateVars = {
  fullName?: string;
  firstName?: string;
  email?: string;
  dashboardUrl?: string;
  createUrl?: string;
  libraryUrl?: string;
  upgradeUrl?: string;
  loginUrl?: string;
  settingsUrl?: string;
  idea1Title?: string;
  idea1Why?: string;
  idea2Title?: string;
  idea2Why?: string;
  trialDaysLeft?: string;
};

export const UCM_EMAIL_TEMPLATE_LABELS: Record<SystemUcmEmailTemplateKey, string> = {
  signup_welcome: "Bienvenue après inscription",
  weekly_content_ideas: "Idées de posts hebdomadaires (jeudi)",
  trial_ending_soon: "Fin d’essai bientôt (J-3)",
  trial_expired: "Essai terminé",
  first_post_nudge: "Relance 1er post (J+3 sans draft)",
  payment_failed: "Échec de paiement Stripe",
  inactivity_nudge: "Inactivité 14 jours",
};

export const UCM_TEMPLATE_LOCALE_LABELS: Record<UcmTemplateLocale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
};

export function isSystemUcmEmailTemplateKey(
  key: string,
): key is SystemUcmEmailTemplateKey {
  return (SYSTEM_UCM_EMAIL_TEMPLATE_KEYS as readonly string[]).includes(key);
}

export function isCustomUcmEmailTemplateKey(
  key: string,
): key is `custom_${string}` {
  return /^custom_[a-z0-9]+(?:_[a-z0-9]+)*$/.test(key);
}

export function slugToCustomUcmTemplateKey(
  slug: string,
): `custom_${string}` | null {
  const normalized = slug
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  if (normalized.length < 2) return null;
  return `custom_${normalized}`;
}

export function resolveUcmTemplateLocale(
  raw?: string | null,
): UcmTemplateLocale {
  if (raw === "en" || raw === "es" || raw === "fr") return raw;
  return DEFAULT_UCM_TEMPLATE_LOCALE;
}

export function ucmTemplateLabel(key: UcmEmailTemplateKey): string {
  if (isSystemUcmEmailTemplateKey(key)) return UCM_EMAIL_TEMPLATE_LABELS[key];
  return key.replace(/^custom_/, "").replace(/_/g, " ");
}

export const UCM_EMAIL_TEMPLATES_COLLECTION = "email_templates";
