"use client";

import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import {
  MarketingIntroParagraph,
  MarketingPageIntro,
} from "@/components/marketing/marketing-page-intro";
import { AppFooter } from "@/components/layout/app-footer";
import { PricingPriceCard } from "@/components/pricing/pricing-price-card";
import { SupportTotalSection } from "@/components/pricing/support-total-section";
import { useAuth } from "@/components/auth/auth-provider";
import { PRICING, TRIAL_DAYS, TRIAL_MAX_POSTS } from "@/lib/subscription/constants";
import type { AppLocale } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";

export function PricingPageContent() {
  const t = useTranslations("pricing");
  const locale = useLocale() as AppLocale;
  const { user } = useAuth();
  const perMonthLabel = t("perMonth");

  return (
    <div className="flex min-h-screen flex-col bg-ns-background">
      <MarketingPageHeader brand={t("brand")} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 md:px-8 md:py-16">
        <MarketingPageIntro eyebrow={t("eyebrow")} title={t("title")} hint={t("wireHint")}>
          <MarketingIntroParagraph>{t("subtitle")}</MarketingIntroParagraph>
          <MarketingIntroParagraph>{t("subtitleNote")}</MarketingIntroParagraph>
        </MarketingPageIntro>

        <div className="mt-12 grid grid-cols-1 items-start gap-6 md:grid-cols-3">
          <PricingPriceCard
            name={t("trial.name")}
            amountUsd={0}
            showPeriod={false}
            description={t("trial.description", { days: TRIAL_DAYS, posts: TRIAL_MAX_POSTS })}
            features={[
              t("trial.f1"),
              t("trial.f2"),
              t("trial.f3"),
              t("trial.f7"),
              t("trial.f4"),
              t("trial.f5"),
              t("trial.f6"),
            ]}
            cta={t("trial.cta")}
            ctaHref="/signup"
            locale={locale}
            perMonthLabel={perMonthLabel}
          />
          <PricingPriceCard
            name={t("pro.name")}
            amountUsd={PRICING.pro.usdMonthly}
            description={t("pro.description", { posts: PRICING.pro.postsPerMonth })}
            features={[
              t("pro.f1"),
              t("pro.f2"),
              t("pro.f3"),
              t("pro.f4"),
              t("pro.f7"),
              t("pro.f5"),
              t("pro.f6"),
            ]}
            cta={t("pro.cta")}
            ctaHref={user ? "/upgrade?plan=pro" : "/signup?plan=pro"}
            highlighted
            badge={t("popular")}
            locale={locale}
            perMonthLabel={perMonthLabel}
          />
          <PricingPriceCard
            name={t("proPlus.name")}
            amountUsd={PRICING.proPlus.usdMonthly}
            description={t("proPlus.description", { posts: PRICING.proPlus.postsPerMonth })}
            features={[
              t("proPlus.f1"),
              t("proPlus.f2"),
              t("proPlus.f3"),
              t("proPlus.f4"),
              t("proPlus.f7"),
              t("proPlus.f5"),
              t("proPlus.f6"),
            ]}
            cta={t("proPlus.cta")}
            ctaHref={user ? "/upgrade?plan=pro_plus" : "/signup?plan=pro_plus"}
            locale={locale}
            perMonthLabel={perMonthLabel}
          />
        </div>

        <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-3 sm:flex-row sm:justify-center">
          <p className="rounded-2xl border border-ns-border bg-white px-4 py-3 text-center text-sm leading-snug text-ns-secondary text-pretty shadow-sm">
            {t("comparePro")}
          </p>
          <p className="rounded-2xl border border-ns-primary/25 bg-ns-primary/5 px-4 py-3 text-center text-sm leading-snug text-ns-tertiary text-pretty shadow-sm">
            {t("compareIncluded")}
          </p>
        </div>

        <p className="mx-auto mt-6 max-w-xl text-center text-xs text-ns-secondary/80 text-pretty">
          {t("usdNote")}
        </p>

        <SupportTotalSection locale={locale} perMonthLabel={perMonthLabel} />
      </main>

      <AppFooter />
    </div>
  );
}
