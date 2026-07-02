"use client";

import { PricingPriceCard } from "@/components/pricing/pricing-price-card";
import { SupportQuoteDialog } from "@/components/pricing/support-quote-dialog";
import { SupportTotalHeading } from "@/components/pricing/support-total-heading";
import { PRICING } from "@/lib/subscription/constants";
import type { AppLocale } from "@/i18n/routing";
import type { SupportQuotePlan } from "@/lib/email/send-support-quote";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  locale: AppLocale;
  perMonthLabel: string;
};

export function SupportTotalSection({ locale, perMonthLabel }: Props) {
  const t = useTranslations("pricing.support");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quotePlan, setQuotePlan] = useState<SupportQuotePlan>("unspecified");

  function openQuote(plan: SupportQuotePlan) {
    setQuotePlan(plan);
    setDialogOpen(true);
  }

  return (
    <>
      <section
        id="support"
        className="relative mt-16 overflow-hidden rounded-3xl bg-ns-hero px-6 py-10 text-white shadow-xl md:px-10 md:py-12"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          aria-hidden
        >
          <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-ns-primary/30 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-ns-secondary/20 blur-3xl" />
        </div>

        <div className="relative">
          <SupportTotalHeading variant="dark" showMode />
          <p className="mt-3 max-w-3xl text-pretty text-sm leading-relaxed text-white/80">
            {t("subtitle")}
          </p>

          <div className="mt-8 grid grid-cols-1 items-start gap-5 md:grid-cols-2">
            <PricingPriceCard
              name={t("starter.name")}
              amountUsd={PRICING.support.starter.usdMonthly}
              description={t("starter.description", {
                posts: PRICING.support.starter.postsPerMonth,
                months: PRICING.support.starter.minMonths,
              })}
              features={[t("starter.f1"), t("starter.f2"), t("starter.f3")]}
              cta={t("cta")}
              ctaHref="#"
              onCtaClick={() => openQuote("starter")}
              locale={locale}
              perMonthLabel={perMonthLabel}
              variant="onDark"
            />
            <PricingPriceCard
              name={t("regular.name")}
              amountUsd={PRICING.support.regular.usdMonthly}
              description={t("regular.description", {
                months: PRICING.support.regular.minMonths,
              })}
              features={[t("regular.f1"), t("regular.f2"), t("regular.f3")]}
              cta={t("cta")}
              ctaHref="#"
              onCtaClick={() => openQuote("regular")}
              locale={locale}
              perMonthLabel={perMonthLabel}
              variant="onDark"
            />
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 border-t border-white/10 pt-8 text-center">
            <p className="max-w-lg text-sm text-white/75">{t("quoteHint")}</p>
            <button
              type="button"
              onClick={() => openQuote("unspecified")}
              className={`${BTN_PRIMARY} min-h-[3rem] px-8`}
            >
              {t("cta")}
            </button>
          </div>
        </div>
      </section>

      <SupportQuoteDialog
        open={dialogOpen}
        plan={quotePlan}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
