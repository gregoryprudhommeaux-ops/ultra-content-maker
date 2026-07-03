"use client";

import { UpgradeQuiz } from "@/components/subscription/upgrade-quiz";
import { CouponActivationForm } from "@/components/subscription/coupon-activation-form";
import { WireTransferForm } from "@/components/subscription/wire-transfer-form";
import { useSubscription } from "@/contexts/subscription-context";
import {
  DashboardPageHero,
  DashboardPageSection,
  DashboardPageShell,
} from "@/components/layout/dashboard-page";
import { PRICING } from "@/lib/subscription/constants";
import { formatUsdAmount } from "@/lib/subscription/format-usd-price";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { BTN_SECONDARY } from "@/lib/ui/nextstep";
import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function UpgradePageClient() {
  const t = useTranslations("subscription.upgrade");
  const tPricing = useTranslations("pricing");
  const locale = useLocale() as AppLocale;
  const { access, loading } = useSubscription();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const suggestedPlan = plan === "pro" || plan === "pro_plus" ? plan : "pro_plus";
  const [couponOpen, setCouponOpen] = useState(false);

  const trialBanner =
    !loading && access?.isTrialActive ? (
      <div className="mb-6 rounded-2xl border border-ns-primary/30 bg-ns-primary/10 px-5 py-4 text-sm text-ns-tertiary">
        <span className="font-semibold">
          {t("trialContext", {
            days: access.trialDaysRemaining ?? 0,
            posts: access.trialPostsRemaining ?? 0,
          })}
        </span>
      </div>
    ) : null;

  return (
    <DashboardPageShell>
      {trialBanner}
      <DashboardPageHero title={t("title")} subtitle={t("subtitle")} />
      <div className="flex flex-col gap-10">
        <DashboardPageSection>
          <UpgradeQuiz />
        </DashboardPageSection>
        <DashboardPageSection>
          <div className="rounded-2xl border border-ns-border bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-xl font-bold text-ns-tertiary">{t("activateTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ns-secondary md:text-base">
              {t("activateBody")}
            </p>
            <div className="mt-6">
              <WireTransferForm suggestedPlan={suggestedPlan} />
            </div>
            <div className="mt-8 border-t border-ns-border pt-6">
              <button
                type="button"
                onClick={() => setCouponOpen((open) => !open)}
                aria-expanded={couponOpen}
                className="flex w-full items-center gap-2 text-left"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-ns-secondary">
                  {t("couponSection")}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-ns-secondary transition-transform ${
                    couponOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden
                />
              </button>
              {couponOpen ? (
                <CouponActivationForm suggestedPlan={suggestedPlan} />
              ) : null}
            </div>
            <div className="mt-8 space-y-4 border-t border-ns-border pt-6 text-sm">
              <p className="text-ns-secondary">
                <strong className="text-ns-tertiary">Pro</strong> ·{" "}
                {formatUsdAmount(PRICING.pro.usdMonthly, locale)}
                {tPricing("perMonth")} · {t("proBlurb")}
              </p>
              <p className="text-ns-secondary">
                <strong className="text-ns-tertiary">Pro+</strong> ·{" "}
                {formatUsdAmount(PRICING.proPlus.usdMonthly, locale)}
                {tPricing("perMonth")} · {t("proPlusBlurb", { posts: PRICING.proPlus.postsPerMonth })}
              </p>
            </div>
            <Link href="/pricing" className={`mt-6 inline-block ${BTN_SECONDARY}`}>
              {t("viewPricing")}
            </Link>
          </div>
        </DashboardPageSection>
      </div>
    </DashboardPageShell>
  );
}
