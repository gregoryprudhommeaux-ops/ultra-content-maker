import type { SupportQuotePlan } from "@/lib/email/send-support-quote";
import {
  billingModeLine,
  cgvBlock,
  defaultCommercialTermsForPlan,
  formatDealAmount,
  noticePeriodLine,
} from "@/lib/admin/support-deal-terms";
import { PRICING } from "@/lib/subscription/constants";
import type { SupportCommercialTerms } from "@/types/subscription";

export type QuoteContentLocale = "fr" | "en" | "es";

export type SupportQuoteProposalLocaleContent = {
  subject: string;
  rhythmLine: string;
  amountLine: string;
  body: string;
};

export type SupportQuoteProposalDraft = {
  fr: SupportQuoteProposalLocaleContent;
  en: SupportQuoteProposalLocaleContent;
  es: SupportQuoteProposalLocaleContent;
};

/** Client-safe quote shape for proposal UI (no server imports). */
export type SupportQuoteForProposal = {
  id: string;
  fullName: string;
  companyName: string;
  position: string;
  activityNeed: string;
  email: string;
  whatsapp: string;
  plan: SupportQuotePlan;
  locale?: string;
  userId?: string;
  status: string;
  adminNote?: string;
  proposalDraft?: SupportQuoteProposalDraft;
  proposalSentAt?: string | null;
  commercialTerms?: SupportCommercialTerms;
  createdAt: string | null;
};

export type SupportQuoteProposalInput = Pick<
  SupportQuoteForProposal,
  "fullName" | "companyName" | "plan" | "activityNeed" | "email" | "locale" | "commercialTerms"
>;

export function resolveCommercialTerms(
  row: Pick<SupportQuoteForProposal, "plan" | "commercialTerms">,
): SupportCommercialTerms {
  return row.commercialTerms ?? defaultCommercialTermsForPlan(row.plan);
}

export function rhythmLineFromTerms(
  plan: SupportQuotePlan,
  terms: SupportCommercialTerms,
  locale: QuoteContentLocale,
): string {
  if (plan === "much_more" && terms.postsCount && terms.period) {
    const count = terms.postsCount;
    if (terms.period === "month") {
      if (locale === "en") return `${count} LinkedIn posts / month`;
      if (locale === "es") return `${count} posts LinkedIn / mes`;
      return `${count} posts LinkedIn / mois`;
    }
    if (locale === "en") return `${count} LinkedIn posts / week`;
    if (locale === "es") return `${count} posts LinkedIn / semana`;
    return `${count} posts LinkedIn / semaine`;
  }
  return rhythmLine(plan, locale);
}

function resolveLocale(raw?: string | null): QuoteContentLocale {
  if (raw === "en" || raw === "es") return raw;
  return "fr";
}

export function clientLocaleForQuote(row: Pick<SupportQuoteForProposal, "locale">): QuoteContentLocale {
  return resolveLocale(row.locale);
}

export function planName(plan: SupportQuotePlan, locale: QuoteContentLocale): string {
  if (locale === "en") {
    if (plan === "starter") return "Support Starter";
    if (plan === "regular") return "Support Regular";
    if (plan === "much_more") return "Much More";
    return "Support Total";
  }
  if (locale === "es") {
    if (plan === "starter") return "Support Starter";
    if (plan === "regular") return "Support Regular";
    if (plan === "much_more") return "Mucho Más";
    return "Support Total";
  }
  if (plan === "starter") return "Support Starter";
  if (plan === "regular") return "Support Régulier";
  if (plan === "much_more") return "Beaucoup Plus";
  return "Support Total";
}

export function rhythmLine(plan: SupportQuotePlan, locale: QuoteContentLocale): string {
  if (plan === "starter") {
    const n = PRICING.support.starter.postsPerMonth;
    if (locale === "en") return `${n} LinkedIn posts / month`;
    if (locale === "es") return `${n} posts LinkedIn / mes`;
    return `${n} posts LinkedIn / mois`;
  }
  if (plan === "regular") {
    if (locale === "en") return "1 LinkedIn post / week";
    if (locale === "es") return "1 post LinkedIn / semana";
    return "1 post LinkedIn / semaine";
  }
  if (plan === "much_more") {
    if (locale === "en") return "High-frequency rhythm · tailored to your goals";
    if (locale === "es") return "Ritmo intensivo · adaptado a sus objetivos";
    return "Rythme intensif · adapté à vos objectifs";
  }
  if (locale === "en") return "Rhythm to be defined together on a call";
  if (locale === "es") return "Ritmo a definir juntos en llamada";
  return "Rythme à définir ensemble lors de l'appel";
}

export function amountLine(plan: SupportQuotePlan, locale: QuoteContentLocale): string {
  const months = PRICING.support.starter.minMonths;
  if (plan === "starter") {
    const amt = `$${PRICING.support.starter.usdMonthly}`;
    if (locale === "en") return `${amt} / month · ${months}-month minimum commitment`;
    if (locale === "es") return `${amt} / mes · compromiso mínimo ${months} meses`;
    return `${amt} / mois · engagement ${months} mois minimum`;
  }
  if (plan === "regular") {
    const amt = `$${PRICING.support.regular.usdMonthly}`;
    if (locale === "en") return `${amt} / month · ${months}-month minimum commitment`;
    if (locale === "es") return `${amt} / mes · compromiso mínimo ${months} meses`;
    return `${amt} / mois · engagement ${months} mois minimum`;
  }
  if (locale === "en") return "Custom quote after scoping call";
  if (locale === "es") return "Presupuesto personalizado tras llamada de cierre";
  return "Sur devis après appel de cadrage";
}

function buildLocaleContent(
  row: Pick<SupportQuoteForProposal, "fullName" | "companyName" | "plan" | "activityNeed" | "commercialTerms">,
  locale: QuoteContentLocale,
): SupportQuoteProposalLocaleContent {
  const terms = resolveCommercialTerms(row);
  const offer = planName(row.plan, locale);
  const rhythm = rhythmLineFromTerms(row.plan, terms, locale);
  const amount = formatDealAmount(terms, locale);
  const billing = billingModeLine(locale);
  const notice = noticePeriodLine(terms, locale);
  const cgv = cgvBlock(locale);
  const name = row.fullName.trim() || row.companyName.trim() || "";
  const company = row.companyName.trim();

  const subject =
    locale === "en"
      ? `Ultra Content Maker · ${offer} proposal${company ? ` · ${company}` : ""}`
      : locale === "es"
        ? `Ultra Content Maker · Propuesta ${offer}${company ? ` · ${company}` : ""}`
        : `Ultra Content Maker · Proposition ${offer}${company ? ` · ${company}` : ""}`;

  const greeting =
    locale === "en"
      ? `Hello${name ? ` ${name}` : ""},`
      : locale === "es"
        ? `Hola${name ? ` ${name}` : ""},`
        : `Bonjour${name ? ` ${name}` : ""},`;

  const intro =
    locale === "en"
      ? `Thank you for your interest in Support Total. Following your request, please find our commercial proposal below.`
      : locale === "es"
        ? `Gracias por su interés en Support Total. Tras su solicitud, le enviamos nuestra propuesta comercial.`
        : `Merci pour votre intérêt pour le Support Total. Suite à votre demande, voici notre proposition commerciale.`;

  const offerLine =
    locale === "en"
      ? `Offer: ${offer}`
      : locale === "es"
        ? `Oferta: ${offer}`
        : `Offre : ${offer}`;

  const rhythmLabel =
    locale === "en" ? `Rhythm: ${rhythm}` : locale === "es" ? `Ritmo: ${rhythm}` : `Rythme : ${rhythm}`;

  const amountLabel =
    locale === "en"
      ? `Investment: ${amount}`
      : locale === "es"
        ? `Inversión: ${amount}`
        : `Investissement : ${amount}`;

  const includes =
    locale === "en"
      ? `Included: briefing, drafting, validation, and publication-ready LinkedIn posts in your voice.`
      : locale === "es"
        ? `Incluye: briefing, redacción, validación y posts LinkedIn listos para publicar con su voz.`
        : `Inclus : brief, rédaction, validation et posts LinkedIn prêts à publier dans votre voix.`;

  const callNote =
    locale === "en"
      ? `We will schedule a short call to align on goals, sector, and editorial calendar before kick-off.`
      : locale === "es"
        ? `Organizaremos una llamada breve para alinear objetivos, sector y calendario editorial antes del inicio.`
        : `Nous planifierons un appel court pour aligner objectifs, secteur et calendrier éditorial avant le démarrage.`;

  const needBlock = row.activityNeed.trim()
    ? [
        "",
        locale === "en"
          ? "Your context:"
          : locale === "es"
            ? "Su contexto:"
            : "Votre contexte :",
        row.activityNeed.trim(),
      ].join("\n")
    : "";

  const closing =
    locale === "en"
      ? `Best regards,\nThe Ultra Content Maker team`
      : locale === "es"
        ? `Saludos cordiales,\nEl equipo Ultra Content Maker`
        : `Bien cordialement,\nL'équipe Ultra Content Maker`;

  const billingLabel =
    locale === "en"
      ? `Billing: ${billing}`
      : locale === "es"
        ? `Facturación: ${billing}`
        : `Facturation : ${billing}`;

  const noticeLabel =
    locale === "en"
      ? `Notice: ${notice}`
      : locale === "es"
        ? `Preaviso: ${notice}`
        : `Préavis : ${notice}`;

  const body = [
    greeting,
    "",
    intro,
    "",
    offerLine,
    rhythmLabel,
    amountLabel,
    billingLabel,
    noticeLabel,
    "",
    includes,
    callNote,
    needBlock,
    "",
    cgv,
    "",
    closing,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return { subject, rhythmLine: rhythm, amountLine: amount, body };
}

export function buildDefaultProposalDraft(
  row: Pick<
    SupportQuoteForProposal,
    "fullName" | "companyName" | "plan" | "activityNeed" | "commercialTerms"
  >,
): SupportQuoteProposalDraft {
  return {
    fr: buildLocaleContent(row, "fr"),
    en: buildLocaleContent(row, "en"),
    es: buildLocaleContent(row, "es"),
  };
}

export function normalizeProposalDraft(raw: unknown): SupportQuoteProposalDraft | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;

  function readLocale(key: QuoteContentLocale): SupportQuoteProposalLocaleContent | null {
    const block = r[key];
    if (!block || typeof block !== "object") return null;
    const b = block as Record<string, unknown>;
    const subject = typeof b.subject === "string" ? b.subject : "";
    const body = typeof b.body === "string" ? b.body : "";
    const rhythmLineVal = typeof b.rhythmLine === "string" ? b.rhythmLine : "";
    const amountLineVal = typeof b.amountLine === "string" ? b.amountLine : "";
    if (!subject && !body) return null;
    return { subject, body, rhythmLine: rhythmLineVal, amountLine: amountLineVal };
  }

  const fr = readLocale("fr");
  const en = readLocale("en");
  const es = readLocale("es");
  if (!fr && !en && !es) return undefined;

  const fallback = fr ?? en ?? es!;
  return {
    fr: fr ?? fallback,
    en: en ?? fallback,
    es: es ?? fallback,
  };
}

export function proposalContentForLocale(
  draft: SupportQuoteProposalDraft,
  locale: QuoteContentLocale,
): SupportQuoteProposalLocaleContent {
  return draft[locale];
}

export function proposalVariablesForQuote(
  row: Pick<
    SupportQuoteForProposal,
    "fullName" | "companyName" | "plan" | "activityNeed" | "email" | "commercialTerms"
  >,
  locale: QuoteContentLocale,
): Record<string, string> {
  const terms = resolveCommercialTerms(row);
  return {
    client_name: row.fullName.trim(),
    company_name: row.companyName.trim(),
    offer: planName(row.plan, locale),
    rhythm: rhythmLineFromTerms(row.plan, terms, locale),
    amount: formatDealAmount(terms, locale),
    billing_mode: billingModeLine(locale),
    min_commitment: String(terms.minCommitmentMonths),
    notice_period: noticePeriodLine(terms, locale),
    cgv_block: cgvBlock(locale),
    context: row.activityNeed.trim(),
    email: row.email.trim(),
  };
}

export function applyProposalPlaceholders(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_match, key: string) => {
    const normalized = key.toLowerCase();
    return variables[normalized] ?? "";
  });
}

export function parseSubjectFromDocument(text: string): { subject?: string; body: string } {
  const lines = text.split("\n");
  const first = lines[0]?.trim() ?? "";
  const subjectMatch = /^(Subject|Objet|Asunto)\s*:\s*(.+)$/i.exec(first);
  if (!subjectMatch) return { body: text.trim() };
  return {
    subject: subjectMatch[2].trim(),
    body: lines.slice(1).join("\n").trim(),
  };
}
