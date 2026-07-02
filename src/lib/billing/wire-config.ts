import { PRICING } from "@/lib/subscription/constants";

export type WirePlan = "pro" | "pro_plus";

export type WireBankDetails = {
  accountHolder: string;
  iban: string;
  bic: string;
  bankName: string;
  currency: string;
  configured: boolean;
};

export function getWireBankDetails(): WireBankDetails {
  const iban = process.env.WIRE_IBAN?.trim() ?? "";
  const bic = process.env.WIRE_BIC?.trim() ?? "";
  const bankName = process.env.WIRE_BANK_NAME?.trim() ?? "";
  const accountHolder =
    process.env.WIRE_ACCOUNT_HOLDER?.trim() || "Ultra Content Maker";
  const currency = process.env.WIRE_CURRENCY?.trim() || "EUR";

  return {
    accountHolder,
    iban,
    bic,
    bankName,
    currency,
    configured: Boolean(iban && bic),
  };
}

export function wireAmountUsd(tier: WirePlan): number {
  return tier === "pro" ? PRICING.pro.usdMonthly : PRICING.proPlus.usdMonthly;
}

/** Shown in bank transfer reference / communication field. */
export function buildWireReference(userId: string, tier: WirePlan): string {
  const suffix = userId.replace(/-/g, "").slice(-6).toUpperCase();
  const tierCode = tier === "pro" ? "PRO" : "PROPLUS";
  return `UCM-${suffix}-${tierCode}`;
}
