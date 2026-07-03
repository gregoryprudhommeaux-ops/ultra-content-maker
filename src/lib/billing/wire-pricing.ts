import { PRICING } from "@/lib/subscription/constants";
import type { WirePlan } from "@/lib/billing/wire-config.types";

export type WirePaymentCurrency = "eur" | "mxn";

/** Fixed wire amounts (no USD checkout). */
export const WIRE_PLAN_AMOUNTS: Record<
  WirePlan,
  Record<WirePaymentCurrency, { amount: number; label: string }>
> = {
  pro: {
    eur: { amount: 16, label: "16 €" },
    mxn: { amount: 330, label: "$330 MXN" },
  },
  pro_plus: {
    eur: { amount: 28, label: "28 €" },
    mxn: { amount: 570, label: "$570 MXN" },
  },
};

export const WIRE_GRACE_DAYS = 7;

const LEGACY_USD_AMOUNTS: Record<WirePlan, number> = {
  pro: PRICING.pro.usdMonthly,
  pro_plus: PRICING.proPlus.usdMonthly,
};

export function wireAmountForCurrency(
  tier: WirePlan,
  currency: WirePaymentCurrency,
): number {
  return WIRE_PLAN_AMOUNTS[tier][currency].amount;
}

/** Canonical wire amount — ignores legacy USD values stored under EUR/MXN. */
export function resolveWireRequestAmount(
  tier: WirePlan,
  currency: WirePaymentCurrency,
  stored?: number | null,
): number {
  const canonical = wireAmountForCurrency(tier, currency);
  if (stored == null || !Number.isFinite(stored) || stored === canonical) {
    return canonical;
  }
  if (stored === LEGACY_USD_AMOUNTS[tier]) {
    return canonical;
  }
  return canonical;
}

export function storedWireAmountNeedsRepair(
  tier: WirePlan,
  currency: WirePaymentCurrency,
  stored?: number | null,
): boolean {
  if (stored == null || !Number.isFinite(stored)) return false;
  return stored !== wireAmountForCurrency(tier, currency);
}

export function formatWireAmountLabel(
  tier: WirePlan,
  currency: WirePaymentCurrency,
): string {
  return WIRE_PLAN_AMOUNTS[tier][currency].label;
}
