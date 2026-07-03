import {
  applyProposalPlaceholders,
  proposalVariablesForQuote,
  type QuoteContentLocale,
  type SupportQuoteProposalDraft,
  type SupportQuoteProposalInput,
  type SupportQuoteProposalLocaleContent,
} from "@/lib/admin/support-quote-proposal-shared";

export type InAppProposalTemplateLocale = {
  subject: string;
  body: string;
};

export type InAppProposalTemplateConfig = {
  fr: InAppProposalTemplateLocale;
  en: InAppProposalTemplateLocale;
  es: InAppProposalTemplateLocale;
  updatedAt?: string | null;
};

export const PROPOSAL_TEMPLATE_PLACEHOLDERS = [
  "{{client_name}}",
  "{{company_name}}",
  "{{offer}}",
  "{{rhythm}}",
  "{{amount}}",
  "{{billing_mode}}",
  "{{min_commitment}}",
  "{{notice_period}}",
  "{{context}}",
  "{{email}}",
  "{{cgv_block}}",
] as const;

export function defaultInAppProposalTemplates(): InAppProposalTemplateConfig {
  return {
    fr: {
      subject: "Ultra Content Maker · Proposition {{offer}} · {{company_name}}",
      body: [
        "Bonjour {{client_name}},",
        "",
        "Merci pour votre intérêt pour le Support Total. Suite à votre demande, voici notre proposition commerciale.",
        "",
        "Offre : {{offer}}",
        "Rythme : {{rhythm}}",
        "Investissement : {{amount}}",
        "Facturation : {{billing_mode}}",
        "Préavis : {{notice_period}}",
        "",
        "Inclus : brief, rédaction, validation et posts LinkedIn prêts à publier dans votre voix.",
        "",
        "Nous planifierons un appel court pour aligner objectifs, secteur et calendrier éditorial avant le démarrage.",
        "",
        "{{context}}",
        "",
        "{{cgv_block}}",
        "",
        "Bien cordialement,",
        "L'équipe Ultra Content Maker",
      ].join("\n"),
    },
    en: {
      subject: "Ultra Content Maker · {{offer}} proposal · {{company_name}}",
      body: [
        "Hello {{client_name}},",
        "",
        "Thank you for your interest in Support Total. Following your request, please find our commercial proposal below.",
        "",
        "Offer: {{offer}}",
        "Rhythm: {{rhythm}}",
        "Investment: {{amount}}",
        "Billing: {{billing_mode}}",
        "Notice: {{notice_period}}",
        "",
        "Included: briefing, drafting, validation, and publication-ready LinkedIn posts in your voice.",
        "",
        "We will schedule a short call to align on goals, sector, and editorial calendar before kick-off.",
        "",
        "{{context}}",
        "",
        "{{cgv_block}}",
        "",
        "Best regards,",
        "The Ultra Content Maker team",
      ].join("\n"),
    },
    es: {
      subject: "Ultra Content Maker · Propuesta {{offer}} · {{company_name}}",
      body: [
        "Hola {{client_name}},",
        "",
        "Gracias por su interés en Support Total. Tras su solicitud, le enviamos nuestra propuesta comercial.",
        "",
        "Oferta: {{offer}}",
        "Ritmo: {{rhythm}}",
        "Inversión: {{amount}}",
        "Facturación: {{billing_mode}}",
        "Preaviso: {{notice_period}}",
        "",
        "Incluye: briefing, redacción, validación y posts LinkedIn listos para publicar con su voz.",
        "",
        "Organizaremos una llamada breve para alinear objetivos, sector y calendario editorial antes del inicio.",
        "",
        "{{context}}",
        "",
        "{{cgv_block}}",
        "",
        "Saludos cordiales,",
        "El equipo Ultra Content Maker",
      ].join("\n"),
    },
    updatedAt: null,
  };
}

function formatContextBlock(context: string, locale: QuoteContentLocale): string {
  const trimmed = context.trim();
  if (!trimmed) return "";
  const label =
    locale === "en" ? "Your context:" : locale === "es" ? "Su contexto:" : "Votre contexte :";
  return `${label}\n${trimmed}`;
}

export function renderProposalFromInAppTemplate(
  row: SupportQuoteProposalInput,
  locale: QuoteContentLocale,
  template: InAppProposalTemplateLocale,
): SupportQuoteProposalLocaleContent {
  const baseVars = proposalVariablesForQuote(row, locale);
  const context = formatContextBlock(baseVars.context, locale);
  const variables = { ...baseVars, context };

  const subject = applyProposalPlaceholders(template.subject.trim(), variables);
  let body = applyProposalPlaceholders(template.body, variables);
  body = body
    .split("\n")
    .filter((line, i, arr) => {
      if (line.trim() !== "") return true;
      const prev = arr[i - 1]?.trim() ?? "x";
      const next = arr[i + 1]?.trim() ?? "x";
      return prev !== "" && next !== "";
    })
    .join("\n")
    .trim();

  return {
    subject,
    rhythmLine: baseVars.rhythm,
    amountLine: baseVars.amount,
    body,
  };
}

export function buildProposalDraftFromInAppTemplates(
  row: SupportQuoteProposalInput,
  config: InAppProposalTemplateConfig,
): SupportQuoteProposalDraft {
  const locales: QuoteContentLocale[] = ["fr", "en", "es"];
  const draft = {} as SupportQuoteProposalDraft;
  for (const locale of locales) {
    const template = config[locale];
    draft[locale] =
      template.body.trim().length > 0
        ? renderProposalFromInAppTemplate(row, locale, template)
        : renderProposalFromInAppTemplate(
            row,
            locale,
            defaultInAppProposalTemplates()[locale],
          );
  }
  return draft;
}

export function unifiedTemplateFromConfig(
  config: InAppProposalTemplateConfig,
): InAppProposalTemplateLocale {
  if (config.fr.subject.trim() || config.fr.body.trim()) return config.fr;
  if (config.en.subject.trim() || config.en.body.trim()) return config.en;
  return config.es;
}

export function configFromUnifiedTemplate(
  template: InAppProposalTemplateLocale,
): InAppProposalTemplateConfig {
  const block = {
    subject: template.subject.trim(),
    body: template.body,
  };
  return {
    fr: block,
    en: block,
    es: block,
    updatedAt: null,
  };
}

export function normalizeInAppProposalTemplates(raw: unknown): InAppProposalTemplateConfig {
  const defaults = defaultInAppProposalTemplates();
  if (!raw || typeof raw !== "object") return defaults;
  const r = raw as Record<string, unknown>;

  function readLocale(locale: QuoteContentLocale): InAppProposalTemplateLocale {
    const block = r[locale];
    if (!block || typeof block !== "object") return defaults[locale];
    const b = block as Record<string, unknown>;
    const subject = typeof b.subject === "string" ? b.subject : defaults[locale].subject;
    const body = typeof b.body === "string" ? b.body : defaults[locale].body;
    return { subject, body };
  }

  return {
    fr: readLocale("fr"),
    en: readLocale("en"),
    es: readLocale("es"),
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : null,
  };
}

export const SAMPLE_PREVIEW_QUOTE: SupportQuoteProposalInput = {
  fullName: "Jean Dupont",
  companyName: "Exemple SAS",
  plan: "starter",
  activityNeed: "Présence LinkedIn pour un dirigeant industriel.",
  email: "client@exemple.com",
  locale: "fr",
};
