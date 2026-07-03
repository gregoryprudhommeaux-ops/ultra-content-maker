import { getWireBankDetailsForCurrency } from "@/lib/billing/wire-config";
import {
  formatInvoiceAmount,
  type BillingInvoiceRow,
} from "@/lib/billing/wire-billing";
import { invoiceKindLabel } from "@/lib/billing/invoice-types";
import { PRICING } from "@/lib/subscription/constants";
import type { SupportProposal } from "@/types/subscription";

type TemplateLocale = "fr" | "en" | "es";

function resolveLocale(raw?: string | null): TemplateLocale {
  if (raw === "en" || raw === "es") return raw;
  return "fr";
}

function formatPeriodMonth(monthKey: string, locale: TemplateLocale): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return monthKey;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  const tag = locale === "es" ? "es-ES" : locale === "en" ? "en-GB" : "fr-FR";
  return new Intl.DateTimeFormat(tag, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    d,
  );
}

function supportRhythmLine(proposal: SupportProposal | undefined, locale: TemplateLocale): string {
  if (!proposal) {
    return locale === "es"
      ? "Production LinkedIn gérée (Support Total)"
      : locale === "en"
        ? "Managed LinkedIn production (Support Total)"
        : "Production LinkedIn gérée (Support Total)";
  }
  if (proposal.rhythm === "starter") {
    return locale === "es"
      ? `${PRICING.support.starter.postsPerMonth} posts / mes`
      : locale === "en"
        ? `${PRICING.support.starter.postsPerMonth} posts / month`
        : `${PRICING.support.starter.postsPerMonth} posts / mois`;
  }
  if (proposal.rhythm === "regular") {
    return locale === "es"
      ? "1 post / semana"
      : locale === "en"
        ? "1 post / week"
        : "1 post / semaine";
  }
  const count = proposal.postsCount ?? 1;
  const period =
    proposal.period === "month"
      ? locale === "es"
        ? "mes"
        : locale === "en"
          ? "month"
          : "mois"
      : locale === "es"
        ? "semana"
        : locale === "en"
          ? "week"
          : "semaine";
  return locale === "es"
    ? `${count} posts / ${period}`
    : locale === "en"
      ? `${count} posts / ${period}`
      : `${count} posts / ${period}`;
}

export function defaultSupportInvoiceAmount(tier: BillingInvoiceRow["tier"]): number {
  if (tier === "support_starter") return PRICING.support.starter.usdMonthly;
  if (tier === "support_regular") return PRICING.support.regular.usdMonthly;
  return 0;
}

export function buildDefaultInvoiceBody(input: {
  invoice: Pick<
    BillingInvoiceRow,
    | "periodMonth"
    | "kind"
    | "tier"
    | "currency"
    | "amount"
    | "memoReference"
    | "customerName"
    | "supportProposal"
  >;
  locale?: string | null;
}): string {
  const locale = resolveLocale(input.locale);
  const period = formatPeriodMonth(input.invoice.periodMonth, locale);
  const offer = invoiceKindLabel(input.invoice.kind, input.invoice.tier);
  const amount = formatInvoiceAmount(input.invoice.currency, input.invoice.amount);
  const client = input.invoice.customerName?.trim() || "—";
  const rhythm =
    input.invoice.kind === "support"
      ? supportRhythmLine(input.invoice.supportProposal, locale)
      : null;

  if (locale === "en") {
    return [
      `INVOICE — Ultra Content Maker`,
      ``,
      `Client: ${client}`,
      `Period: ${period}`,
      `Offer: ${offer}`,
      rhythm ? `Rhythm: ${rhythm}` : null,
      `Amount due: ${amount}`,
      `Payment reference: ${input.invoice.memoReference}`,
      ``,
      `Thank you for your trust.`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (locale === "es") {
    return [
      `FACTURA — Ultra Content Maker`,
      ``,
      `Cliente: ${client}`,
      `Período: ${period}`,
      `Oferta: ${offer}`,
      rhythm ? `Ritmo: ${rhythm}` : null,
      `Importe: ${amount}`,
      `Referencia de pago: ${input.invoice.memoReference}`,
      ``,
      `Gracias por su confianza.`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `FACTURE — Ultra Content Maker`,
    ``,
    `Client : ${client}`,
    `Période : ${period}`,
    `Offre : ${offer}`,
    rhythm ? `Rythme : ${rhythm}` : null,
    `Montant dû : ${amount}`,
    `Référence de paiement : ${input.invoice.memoReference}`,
    ``,
    `Merci pour votre confiance.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildDefaultEmailSubject(input: {
  invoice: Pick<BillingInvoiceRow, "periodMonth" | "kind" | "tier">;
  locale?: string | null;
}): string {
  const locale = resolveLocale(input.locale);
  const period = formatPeriodMonth(input.invoice.periodMonth, locale);
  const offer = invoiceKindLabel(input.invoice.kind, input.invoice.tier);
  if (locale === "es") return `Factura Ultra Content Maker · ${offer} · ${period}`;
  if (locale === "en") return `Ultra Content Maker invoice · ${offer} · ${period}`;
  return `Facture Ultra Content Maker · ${offer} · ${period}`;
}

export function buildDefaultEmailBody(input: {
  invoice: Pick<
    BillingInvoiceRow,
    | "periodMonth"
    | "kind"
    | "tier"
    | "currency"
    | "amount"
    | "memoReference"
    | "customerName"
    | "invoiceBody"
  >;
  locale?: string | null;
}): string {
  const locale = resolveLocale(input.locale);
  const name = input.invoice.customerName?.trim() || "";
  const amount = formatInvoiceAmount(input.invoice.currency, input.invoice.amount);
  const bank = getWireBankDetailsForCurrency(input.invoice.currency);
  const period = formatPeriodMonth(input.invoice.periodMonth, locale);

  const greeting =
    locale === "es"
      ? `Hola${name ? ` ${name}` : ""},`
      : locale === "en"
        ? `Hello${name ? ` ${name}` : ""},`
        : `Bonjour${name ? ` ${name}` : ""},`;

  const intro =
    locale === "es"
      ? `Adjuntamos la factura de su abono Ultra Content Maker para ${period}.`
      : locale === "en"
        ? `Please find your Ultra Content Maker invoice for ${period}.`
        : `Veuillez trouver ci-dessous votre facture Ultra Content Maker pour ${period}.`;

  const payLine =
    locale === "es"
      ? `Importe a transferir : ${amount}`
      : locale === "en"
        ? `Amount to transfer: ${amount}`
        : `Montant à virer : ${amount}`;

  const refLine =
    locale === "es"
      ? `Referencia : ${input.invoice.memoReference}`
      : locale === "en"
        ? `Reference: ${input.invoice.memoReference}`
        : `Référence : ${input.invoice.memoReference}`;

  const bankHint =
    locale === "es"
      ? bank.configured
        ? "Coordenadas bancarias disponibles en su espacio cliente."
        : "Le enviaremos las coordenadas bancarias si es necesario."
      : locale === "en"
        ? bank.configured
          ? "Bank details are available in your client area."
          : "We will share bank details if needed."
        : bank.configured
          ? "Les coordonnées bancaires sont disponibles dans votre espace client."
          : "Nous vous transmettrons les coordonnées bancaires si besoin.";

  const invoiceBlock = input.invoice.invoiceBody?.trim() || buildDefaultInvoiceBody({
    invoice: input.invoice,
    locale,
  });

  return [greeting, "", intro, "", payLine, refLine, bankHint, "", "---", invoiceBlock].join("\n");
}

export function hydrateInvoiceTemplates(
  invoice: BillingInvoiceRow,
): Pick<BillingInvoiceRow, "invoiceBody" | "emailSubject" | "emailBody"> {
  const invoiceBody =
    invoice.invoiceBody?.trim() ||
    buildDefaultInvoiceBody({ invoice, locale: invoice.locale });
  const emailSubject =
    invoice.emailSubject?.trim() ||
    buildDefaultEmailSubject({ invoice, locale: invoice.locale });
  const emailBody =
    invoice.emailBody?.trim() ||
    buildDefaultEmailBody({
      invoice: { ...invoice, invoiceBody },
      locale: invoice.locale,
    });
  return { invoiceBody, emailSubject, emailBody };
}
