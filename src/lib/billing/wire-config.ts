import type { WirePaymentCurrency } from "@/lib/billing/wire-pricing";
import type { WirePlan } from "@/lib/billing/wire-config.types";
import { PRICING } from "@/lib/subscription/constants";
import type { ContentLanguage } from "@/types/workspace";

export type { WirePlan } from "@/lib/billing/wire-config.types";

export function isContentLanguage(value?: string | null): value is ContentLanguage {
  return value === "en" || value === "fr" || value === "es";
}

export function localeToWireCurrency(locale?: string | null): WirePaymentCurrency {
  return locale === "es" ? "mxn" : "eur";
}

export function wireAmountUsd(tier: WirePlan): number {
  return tier === "pro" ? PRICING.pro.usdMonthly : PRICING.proPlus.usdMonthly;
}

export type WireBankDetailsMx = {
  rail: "mx_clabe";
  configured: boolean;
  entity: string;
  clabe: string;
  accountNumber: string;
  accountHolder: string;
  currency: "MXN";
};

export type WireBankDetailsSepa = {
  rail: "sepa";
  configured: boolean;
  accountHolder: string;
  iban: string;
  bic: string;
  bankName: string;
  currency: string;
};

export type WireBankDetails = WireBankDetailsMx | WireBankDetailsSepa;

export function getWireBankDetailsMx(): WireBankDetailsMx {
  const entity = process.env.WIRE_MX_ENTITY?.trim() ?? "";
  const clabe = process.env.WIRE_MX_CLABE?.trim() ?? "";
  const accountNumber = process.env.WIRE_MX_ACCOUNT_NUMBER?.trim() ?? "";
  const accountHolder = process.env.WIRE_MX_ACCOUNT_HOLDER?.trim() ?? "";

  return {
    rail: "mx_clabe",
    entity,
    clabe,
    accountNumber,
    accountHolder,
    currency: "MXN",
    configured: Boolean(entity && clabe && accountHolder),
  };
}

export function getWireBankDetailsSepa(): WireBankDetailsSepa {
  const iban = (
    process.env.WIRE_SEPA_IBAN?.trim() ??
    process.env.WIRE_IBAN?.trim() ??
    ""
  ).replace(/\s/g, "");
  const bic = process.env.WIRE_SEPA_BIC?.trim() ?? process.env.WIRE_BIC?.trim() ?? "";
  const bankName =
    process.env.WIRE_SEPA_BANK_NAME?.trim() ??
    process.env.WIRE_BANK_NAME?.trim() ??
    "";
  const accountHolder =
    process.env.WIRE_SEPA_ACCOUNT_HOLDER?.trim() ??
    process.env.WIRE_ACCOUNT_HOLDER?.trim() ??
    "Ultra Content Maker";
  const currency =
    process.env.WIRE_SEPA_CURRENCY?.trim() ??
    process.env.WIRE_CURRENCY?.trim() ??
    "EUR";

  return {
    rail: "sepa",
    accountHolder,
    iban,
    bic,
    bankName,
    currency,
    configured: Boolean(iban && bic && accountHolder),
  };
}

export function getWireBankDetailsForCurrency(
  currency: WirePaymentCurrency,
): WireBankDetails {
  return currency === "mxn" ? getWireBankDetailsMx() : getWireBankDetailsSepa();
}

export function getWireBankDetails(locale?: string | null): WireBankDetails {
  const currency = isContentLanguage(locale) ? localeToWireCurrency(locale) : "eur";
  return getWireBankDetailsForCurrency(currency);
}

/** Shown in bank transfer reference / communication field. */
export function buildWireReference(userId: string, tier: WirePlan): string {
  const suffix = userId.replace(/-/g, "").slice(-6).toUpperCase();
  const tierCode = tier === "pro" ? "PRO" : "PROPLUS";
  return `UCM-${suffix}-${tierCode}`;
}

/** Full transfer memo: reference + payer name + user id (required for reconciliation). */
export function buildWireTransferMemo(input: {
  userId: string;
  tier: WirePlan;
  displayName?: string;
}): string {
  const ref = buildWireReference(input.userId, input.tier);
  const name = (input.displayName ?? "").trim().replace(/\s+/g, " ");
  const uidShort = input.userId.slice(0, 8);
  const parts = [ref];
  if (name) parts.push(name);
  parts.push(uidShort);
  return parts.join(" · ");
}
