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

export function wireAmountForCurrency(
  tier: WirePlan,
  currency: WirePaymentCurrency,
): number {
  return WIRE_PLAN_AMOUNTS[tier][currency].amount;
}

export function formatWireAmountLabel(
  tier: WirePlan,
  currency: WirePaymentCurrency,
): string {
  return WIRE_PLAN_AMOUNTS[tier][currency].label;
}
