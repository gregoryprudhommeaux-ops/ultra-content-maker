import type { WirePaymentCurrency } from "@/lib/billing/wire-pricing";
import type { SupportProposal } from "@/types/subscription";

/** Invoice lifecycle — admin validates before send. */
export type BillingInvoiceStatus =
  | "draft"
  | "ready_to_send"
  | "sent"
  | "paid"
  | "follow_up"
  | "void";

export type BillingInvoiceKind = "wire" | "support";

export type BillingInvoiceTier =
  | "pro"
  | "pro_plus"
  | "support_starter"
  | "support_regular"
  | "support_total";

export type BillingInvoiceRow = {
  id: string;
  userId: string;
  periodMonth: string;
  kind: BillingInvoiceKind;
  tier: BillingInvoiceTier;
  currency: WirePaymentCurrency;
  amount: number;
  status: BillingInvoiceStatus;
  memoReference: string;
  wireRequestId?: string;
  customerEmail?: string;
  customerName?: string;
  invoiceBody?: string;
  emailSubject?: string;
  emailBody?: string;
  scheduledSendAt?: string | null;
  sentAt?: string | null;
  paidAt?: string | null;
  supportProposal?: SupportProposal;
  locale?: string;
  createdAt: string | null;
  updatedAt?: string | null;
};

const VALID_STATUS: BillingInvoiceStatus[] = [
  "draft",
  "ready_to_send",
  "sent",
  "paid",
  "follow_up",
  "void",
];

export function normalizeInvoiceStatus(raw: unknown): BillingInvoiceStatus {
  if (raw === "draft") return "draft";
  if (raw === "ready_to_send") return "ready_to_send";
  if (raw === "sent") return "sent";
  if (raw === "paid") return "paid";
  if (raw === "follow_up") return "follow_up";
  if (raw === "void") return "void";
  /** @deprecated legacy */
  if (raw === "pending") return "draft";
  return "draft";
}

export function isBillingInvoiceStatus(value: string): value is BillingInvoiceStatus {
  return (VALID_STATUS as string[]).includes(value);
}

export function normalizeInvoiceTier(raw: unknown): BillingInvoiceTier {
  if (raw === "pro_plus") return "pro_plus";
  if (raw === "support_starter") return "support_starter";
  if (raw === "support_regular") return "support_regular";
  if (raw === "support_total") return "support_total";
  return "pro";
}

export function normalizeInvoiceKind(raw: unknown, tier: BillingInvoiceTier): BillingInvoiceKind {
  if (raw === "support") return "support";
  if (raw === "wire") return "wire";
  return tier.startsWith("support_") ? "support" : "wire";
}

export function invoiceKindLabel(kind: BillingInvoiceKind, tier: BillingInvoiceTier): string {
  if (kind === "support") {
    if (tier === "support_starter") return "Support Starter";
    if (tier === "support_regular") return "Support Regular";
    return "Support Total";
  }
  return tier === "pro_plus" ? "Pro+" : "Pro";
}
