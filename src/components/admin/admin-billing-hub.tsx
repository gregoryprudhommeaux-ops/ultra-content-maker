"use client";

import { AdminSupportRenewalsPanel } from "@/components/admin/admin-support-renewals-panel";
import { AdminCommercialProposalsPanel } from "@/components/admin/admin-commercial-proposals-panel";
import { AdminBillingInvoicesPanel } from "@/components/admin/admin-billing-invoices-panel";
import { AdminCockpitSection } from "@/components/admin/admin-cockpit-layout";
import { AdminSubscriptionPanel } from "@/components/admin/admin-subscription-panel";
import { AdminWeeklyDigestPanel } from "@/components/admin/admin-weekly-digest-panel";
import { AdminWireRequestsPanel } from "@/components/admin/admin-wire-requests-panel";
import { useTranslations } from "next-intl";

export function AdminBillingHub() {
  const t = useTranslations("adminBilling");

  return (
    <div className="space-y-8">
      <AdminCockpitSection title={t("sectionTitle")} subtitle={t("sectionSubtitle")}>
        <AdminWireRequestsPanel embedded />
      </AdminCockpitSection>

      <AdminCockpitSection title={t("proposalsTitle")} subtitle={t("proposalsSubtitle")}>
        <AdminCommercialProposalsPanel embedded />
      </AdminCockpitSection>

      <AdminCockpitSection title={t("renewalsTitle")} subtitle={t("renewalsSubtitle")}>
        <AdminSupportRenewalsPanel embedded />
      </AdminCockpitSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminBillingInvoicesPanel embedded />
        <AdminSubscriptionPanel embedded />
      </div>

      <AdminWeeklyDigestPanel embedded />
    </div>
  );
}
