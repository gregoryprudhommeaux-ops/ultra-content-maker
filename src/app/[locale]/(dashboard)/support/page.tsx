"use client";

import { SupportPlanPicker } from "@/components/pricing/support-plan-picker";
import { SupportTotalHeading } from "@/components/pricing/support-total-heading";
import { SupportQuoteForm } from "@/components/pricing/support-quote-form";
import { useAuth } from "@/components/auth/auth-provider";
import type { SupportQuotePlan } from "@/lib/email/send-support-quote";
import {
  DashboardPageSection,
  DashboardPageShell,
} from "@/components/layout/dashboard-page";
import { useTranslations } from "next-intl";
import { useState } from "react";

export default function SupportContactPage() {
  const t = useTranslations("subscription.support");
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<SupportQuotePlan>("starter");

  return (
    <DashboardPageShell>
      <header className="mb-8">
        <SupportTotalHeading namespace="subscription" showMode />
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ns-secondary">{t("subtitle")}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-5 lg:items-start">
        <div className="lg:col-span-2">
          <DashboardPageSection>
            <div className="rounded-2xl border border-ns-border bg-ns-brand-light/40 p-6">
              <p className="text-sm leading-relaxed text-ns-secondary">{t("body")}</p>
              <div className="mt-6">
                <SupportPlanPicker value={selectedPlan} onChange={setSelectedPlan} />
              </div>
              <p className="mt-5 text-xs leading-relaxed text-ns-secondary">{t("responseHint")}</p>
              <p className="mt-2 text-xs leading-relaxed text-ns-primary">{t("phoneCallNote")}</p>
            </div>
          </DashboardPageSection>
        </div>

        <div className="lg:col-span-3">
          <DashboardPageSection>
            <div className="rounded-2xl border border-ns-border bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-lg font-bold text-ns-tertiary">{t("formTitle")}</h2>
              <p className="mt-1 text-sm text-ns-secondary">{t("formSubtitle")}</p>
              <div className="mt-6">
                <SupportQuoteForm
                  key={selectedPlan}
                  plan={selectedPlan}
                  defaultEmail={user?.email ?? ""}
                />
              </div>
            </div>
          </DashboardPageSection>
        </div>
      </div>
    </DashboardPageShell>
  );
}
