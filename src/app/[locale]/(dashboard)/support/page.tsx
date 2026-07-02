"use client";

import { SupportTotalHeading } from "@/components/pricing/support-total-heading";
import { SupportQuoteForm } from "@/components/pricing/support-quote-form";
import { useAuth } from "@/components/auth/auth-provider";
import {
  DashboardPageSection,
  DashboardPageShell,
} from "@/components/layout/dashboard-page";
import { PRICING } from "@/lib/subscription/constants";
import { useTranslations } from "next-intl";

export default function SupportContactPage() {
  const t = useTranslations("subscription.support");
  const { user } = useAuth();

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
            <ul className="mt-6 space-y-4 text-sm">
              <li className="rounded-xl border border-ns-border/80 bg-white p-4">
                <p className="font-bold text-ns-tertiary">{t("starterLabel")}</p>
                <p className="mt-1 text-ns-secondary">
                  ${PRICING.support.starter.usdMonthly}
                  {t("perMonth")} · {t("starterDetail", { posts: PRICING.support.starter.postsPerMonth })}
                </p>
              </li>
              <li className="rounded-xl border border-ns-border/80 bg-white p-4">
                <p className="font-bold text-ns-tertiary">{t("regularLabel")}</p>
                <p className="mt-1 text-ns-secondary">
                  ${PRICING.support.regular.usdMonthly}
                  {t("perMonth")} · {t("regularDetail")}
                </p>
              </li>
            </ul>
            <p className="mt-5 text-xs text-ns-secondary">{t("responseHint")}</p>
          </div>
        </DashboardPageSection>
        </div>

        <div className="lg:col-span-3">
          <DashboardPageSection>
          <div className="rounded-2xl border border-ns-border bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-lg font-bold text-ns-tertiary">{t("formTitle")}</h2>
            <p className="mt-1 text-sm text-ns-secondary">{t("formSubtitle")}</p>
            <div className="mt-6">
              <SupportQuoteForm plan="unspecified" defaultEmail={user?.email ?? ""} />
            </div>
          </div>
        </DashboardPageSection>
        </div>
      </div>
    </DashboardPageShell>
  );
}
