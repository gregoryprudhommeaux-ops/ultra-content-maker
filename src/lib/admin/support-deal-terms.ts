import type { SupportQuotePlan } from "@/lib/email/send-support-quote";
import { PRICING, supportTierFromRhythm } from "@/lib/subscription/constants";
import type {
  SupportCommercialTerms,
  SupportContract,
  SupportProposal,
  SubscriptionTier,
} from "@/types/subscription";

export const DEFAULT_MIN_COMMITMENT_MONTHS = 3;
export const DEFAULT_NOTICE_PERIOD_MONTHS = 1;

export function defaultMonthlyAmountForPlan(plan: SupportQuotePlan): number {
  if (plan === "starter") return PRICING.support.starter.usdMonthly;
  if (plan === "regular") return PRICING.support.regular.usdMonthly;
  return 0;
}

export function defaultCommercialTermsForPlan(
  plan: SupportQuotePlan,
  overrides?: Partial<SupportCommercialTerms>,
): SupportCommercialTerms {
  const postsCount =
    overrides?.postsCount ??
    (plan === "much_more" ? 3 : plan === "starter" ? PRICING.support.starter.postsPerMonth : 1);
  const period = overrides?.period ?? (plan === "regular" || plan === "much_more" ? "week" : "month");

  return {
    monthlyAmount: overrides?.monthlyAmount ?? defaultMonthlyAmountForPlan(plan),
    currency: overrides?.currency ?? "eur",
    minCommitmentMonths: overrides?.minCommitmentMonths ?? DEFAULT_MIN_COMMITMENT_MONTHS,
    noticePeriodMonths: overrides?.noticePeriodMonths ?? DEFAULT_NOTICE_PERIOD_MONTHS,
    postsCount: plan === "much_more" || plan === "starter" ? postsCount : undefined,
    period: plan === "much_more" || plan === "regular" ? period : undefined,
  };
}

export function normalizeCommercialTerms(raw: unknown): SupportCommercialTerms | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const monthlyAmount = typeof r.monthlyAmount === "number" ? r.monthlyAmount : NaN;
  if (!Number.isFinite(monthlyAmount) || monthlyAmount < 0) return undefined;
  return {
    monthlyAmount,
    currency: r.currency === "mxn" ? "mxn" : "eur",
    minCommitmentMonths:
      typeof r.minCommitmentMonths === "number" && r.minCommitmentMonths > 0
        ? r.minCommitmentMonths
        : DEFAULT_MIN_COMMITMENT_MONTHS,
    noticePeriodMonths:
      typeof r.noticePeriodMonths === "number" && r.noticePeriodMonths > 0
        ? r.noticePeriodMonths
        : DEFAULT_NOTICE_PERIOD_MONTHS,
    postsCount: typeof r.postsCount === "number" && r.postsCount > 0 ? r.postsCount : undefined,
    period: r.period === "week" || r.period === "month" ? r.period : undefined,
  };
}

export function normalizeSupportContract(raw: unknown): SupportContract | undefined {
  const terms = normalizeCommercialTerms(raw);
  if (!terms) return undefined;
  const r = raw as Record<string, unknown>;
  const contractStartAt = typeof r.contractStartAt === "string" ? r.contractStartAt : "";
  const contractEndAt = typeof r.contractEndAt === "string" ? r.contractEndAt : "";
  if (!contractStartAt || !contractEndAt) return undefined;
  const renewalStatus =
    r.renewalStatus === "renewal_due" || r.renewalStatus === "not_renewing"
      ? r.renewalStatus
      : "active";
  return {
    ...terms,
    contractStartAt,
    contractEndAt,
    sourceQuoteId: typeof r.sourceQuoteId === "string" ? r.sourceQuoteId : undefined,
    acceptedAt: typeof r.acceptedAt === "string" ? r.acceptedAt : undefined,
    renewalStatus,
    lastRenewalReminderAt:
      typeof r.lastRenewalReminderAt === "string" ? r.lastRenewalReminderAt : undefined,
  };
}

export function supportProposalFromDeal(
  plan: SupportQuotePlan,
  terms: SupportCommercialTerms,
): SupportProposal {
  if (plan === "starter") return { rhythm: "starter" };
  if (plan === "regular") return { rhythm: "regular" };
  return {
    rhythm: "custom",
    postsCount: terms.postsCount ?? 3,
    period: terms.period ?? "week",
  };
}

export function tierFromSupportPlan(plan: SupportQuotePlan): SubscriptionTier {
  if (plan === "starter" || plan === "regular" || plan === "much_more") {
    return supportTierFromRhythm(plan);
  }
  return "support_total";
}

export function addMonthsUtc(iso: string, months: number): string {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
}

export function buildSupportContractFromTerms(
  terms: SupportCommercialTerms,
  sourceQuoteId: string,
  startAt = new Date().toISOString(),
): SupportContract {
  return {
    ...terms,
    contractStartAt: startAt,
    contractEndAt: addMonthsUtc(startAt, terms.minCommitmentMonths),
    sourceQuoteId,
    acceptedAt: startAt,
    renewalStatus: "active",
  };
}

export function formatDealAmount(terms: SupportCommercialTerms, locale: "fr" | "en" | "es"): string {
  const formatted =
    terms.currency === "mxn"
      ? `MX$${terms.monthlyAmount}`
      : `${terms.monthlyAmount} €`;
  if (locale === "en") {
    return `${formatted} / month · ${terms.minCommitmentMonths}-month minimum commitment`;
  }
  if (locale === "es") {
    return `${formatted} / mes · compromiso mínimo ${terms.minCommitmentMonths} meses`;
  }
  return `${formatted} / mois · engagement ${terms.minCommitmentMonths} mois minimum`;
}

export function billingModeLine(locale: "fr" | "en" | "es"): string {
  if (locale === "en") return "Monthly billing by invoice";
  if (locale === "es") return "Facturación mensual por factura";
  return "Facturation mensuelle sur facture";
}

export function noticePeriodLine(terms: SupportCommercialTerms, locale: "fr" | "en" | "es"): string {
  const n = terms.noticePeriodMonths;
  if (locale === "en") return `${n}-month notice period before termination`;
  if (locale === "es") return `Preaviso de ${n} mes antes de la rescisión`;
  return `Préavis de ${n} mois avant résiliation`;
}

export function cgvBlock(locale: "fr" | "en" | "es"): string {
  if (locale === "en") {
    return [
      "Standard terms:",
      "· Service: LinkedIn post production (briefing, drafting, validation).",
      "· Billing: monthly invoice, payable on receipt.",
      `· Minimum commitment and notice period as stated above.`,
      "· Intellectual property: content validated by the client belongs to the client.",
      "· Confidentiality: both parties keep exchanged information confidential.",
    ].join("\n");
  }
  if (locale === "es") {
    return [
      "Condiciones generales:",
      "· Servicio: producción de posts LinkedIn (briefing, redacción, validación).",
      "· Facturación: factura mensual, pago a la recepción.",
      "· Compromiso mínimo y preaviso según lo indicado arriba.",
      "· Propiedad intelectual: el contenido validado por el cliente pertenece al cliente.",
      "· Confidencialidad: ambas partes mantienen la confidencialidad.",
    ].join("\n");
  }
  return [
    "Conditions générales de vente :",
    "· Prestation : production de posts LinkedIn (brief, rédaction, validation).",
    "· Facturation : facture mensuelle, paiement à réception.",
    "· Engagement minimum et préavis tels qu'indiqués ci-dessus.",
    "· Propriété intellectuelle : les contenus validés par le client appartiennent au client.",
    "· Confidentialité : les échanges restent confidentiels entre les parties.",
  ].join("\n");
}
