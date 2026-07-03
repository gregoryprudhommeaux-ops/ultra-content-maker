import type { WirePaymentCurrency } from "@/lib/billing/wire-pricing";
import { WIRE_GRACE_DAYS } from "@/lib/billing/wire-pricing";
import type { SubscriptionProfile } from "@/types/subscription";

/** Last day of calendar month (UTC), 23:59:59.999 */
export function endOfUtcMonth(year: number, month1: number): Date {
  return new Date(Date.UTC(year, month1, 0, 23, 59, 59, 999));
}

export function monthKeyFromDate(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthKey(key: string): { year: number; month1: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month1 = Number(m[2]);
  if (month1 < 1 || month1 > 12) return null;
  return { year, month1 };
}

export function endOfMonthKey(monthKey: string): Date | null {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return null;
  return endOfUtcMonth(parsed.year, parsed.month1 + 1);
}

/** Extend paid coverage to end of given month (YYYY-MM). */
export function wireCoverageEndForMonth(monthKey: string): Date | null {
  return endOfMonthKey(monthKey);
}

export function nextMonthKey(monthKey: string): string | null {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return null;
  const d = new Date(Date.UTC(parsed.year, parsed.month1, 1));
  d.setUTCMonth(d.getUTCMonth() + 1);
  return monthKeyFromDate(d);
}

export function maxMonthKey(a: string, b: string): string {
  return a >= b ? a : b;
}

/** When coverage ends, grace runs WIRE_GRACE_DAYS then account suspends. */
export function wireGraceEndsAt(coverageEnd: Date): Date {
  const g = new Date(coverageEnd);
  g.setUTCDate(g.getUTCDate() + WIRE_GRACE_DAYS);
  return g;
}

export function isWireSubscription(profile: SubscriptionProfile): boolean {
  return (
    profile.activationMethod === "wire" &&
    (profile.tier === "pro" || profile.tier === "pro_plus")
  );
}

export function isWireSubscriptionSuspended(
  profile: SubscriptionProfile,
  now = new Date(),
): boolean {
  if (!isWireSubscription(profile)) return false;
  const coverageEndIso = profile.wireCoverageEnd;
  if (!coverageEndIso) return false;
  const coverageEnd = new Date(coverageEndIso);
  if (Number.isNaN(coverageEnd.getTime())) return false;
  return now.getTime() > wireGraceEndsAt(coverageEnd).getTime();
}

export function wireCoverageMonth(profile: SubscriptionProfile): string | null {
  const iso = profile.wireCoverageEnd;
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return monthKeyFromDate(d);
}

export type BillingInvoiceStatus = "pending" | "paid" | "void";

export type BillingInvoiceRow = {
  id: string;
  userId: string;
  periodMonth: string;
  tier: "pro" | "pro_plus";
  currency: WirePaymentCurrency;
  amount: number;
  status: BillingInvoiceStatus;
  memoReference: string;
  wireRequestId?: string;
  createdAt: string | null;
  paidAt?: string | null;
};

export function formatInvoiceAmount(currency: WirePaymentCurrency, amount: number): string {
  return currency === "eur" ? `${amount} €` : `$${amount} MXN`;
}
