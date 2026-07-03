import type { Firestore } from "firebase-admin/firestore";
import {
  isWireSubscription,
  isWireSubscriptionSuspended,
  wireGraceEndsAt,
} from "@/lib/billing/wire-billing";
import {
  ensureDraftRenewalInvoice,
  renewalPeriodForReminder,
} from "@/lib/billing/invoices.server";
import { buildWireTransferMemo } from "@/lib/billing/wire-config";
import type { WirePlan } from "@/lib/billing/wire-config.types";
import type { WirePaymentCurrency } from "@/lib/billing/wire-pricing";
import { wireAmountForCurrency } from "@/lib/billing/wire-pricing";
import { sendWireGraceReminderEmail } from "@/lib/email/send-wire-grace-reminder";
import { runSupportInvoiceDraftCron } from "@/lib/billing/support-invoices.server";
import {
  getSubscriptionProfileServer,
  setSubscriptionProfileServer,
} from "@/lib/subscription/subscription.server";
import type { SubscriptionProfile } from "@/types/subscription";

export type WireBillingCronResult = {
  scanned: number;
  suspended: number;
  graceRemindersSent: number;
  renewalInvoicesCreated: number;
  supportDraftsCreated: number;
  isReminderDay: boolean;
  renewalPeriod: string | null;
};

function resolveWirePlan(profile: SubscriptionProfile): WirePlan {
  if (profile.wirePlan === "pro" || profile.wirePlan === "pro_plus") {
    return profile.wirePlan;
  }
  return profile.tier === "pro_plus" ? "pro_plus" : "pro";
}

export async function runWireBillingCron(
  db: Firestore,
  now = new Date(),
): Promise<WireBillingCronResult> {
  const day = now.getUTCDate();
  const isReminderDay = day === 28;
  const renewalPeriod = isReminderDay ? renewalPeriodForReminder(now) : null;

  const snap = await db
    .collection("users")
    .where("subscription.activationMethod", "==", "wire")
    .get();

  let suspended = 0;
  let graceRemindersSent = 0;
  let renewalInvoicesCreated = 0;

  const supportResult = isReminderDay
    ? await runSupportInvoiceDraftCron(db, now)
    : { draftsCreated: 0, periodMonth: null };

  for (const doc of snap.docs) {
    const data = doc.data();
    const profile = await getSubscriptionProfileServer(doc.id);
    if (!isWireSubscription(profile)) continue;

    if (isWireSubscriptionSuspended(profile, now)) {
      suspended += 1;
      continue;
    }

    const tier = resolveWirePlan(profile);
    const currency: WirePaymentCurrency = profile.wirePreferredCurrency ?? "eur";
    const email = typeof data.email === "string" ? data.email.trim() : "";
    const displayName = typeof data.displayName === "string" ? data.displayName : undefined;
    const locale =
      typeof data.preferredLocale === "string"
        ? data.preferredLocale
        : typeof data.locale === "string"
          ? data.locale
          : undefined;

    const coverageEndIso = profile.wireCoverageEnd;
    if (coverageEndIso && email) {
      const coverageEnd = new Date(coverageEndIso);
      const graceEnd = wireGraceEndsAt(coverageEnd);
      const inGrace =
        now.getTime() > coverageEnd.getTime() && now.getTime() <= graceEnd.getTime();
      const coverageKey = coverageEndIso.slice(0, 10);

      if (inGrace && profile.wireGraceReminderFor !== coverageKey) {
        const transferMemo = buildWireTransferMemo({
          userId: doc.id,
          tier,
          displayName,
        });

        await sendWireGraceReminderEmail({
          userEmail: email,
          displayName,
          currency,
          amount: wireAmountForCurrency(tier, currency),
          transferMemo,
          graceEndsAt: graceEnd.toISOString(),
          locale,
        }).catch(() => undefined);

        await setSubscriptionProfileServer(doc.id, {
          wireGraceReminderFor: coverageKey,
        });
        graceRemindersSent += 1;
      }
    }

    if (isReminderDay && renewalPeriod && email) {
      const { created } = await ensureDraftRenewalInvoice(db, {
        userId: doc.id,
        tier,
        currency,
        periodMonth: renewalPeriod,
        displayName,
        customerEmail: email,
        locale,
      });

      if (created) {
        renewalInvoicesCreated += 1;
      }
    }
  }

  return {
    scanned: snap.size,
    suspended,
    graceRemindersSent,
    renewalInvoicesCreated,
    supportDraftsCreated: supportResult.draftsCreated,
    isReminderDay,
    renewalPeriod,
  };
}
