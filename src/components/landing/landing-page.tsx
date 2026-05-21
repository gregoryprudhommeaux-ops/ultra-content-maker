"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NsMark } from "@/components/brand/ns-mark";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingPillars } from "@/components/landing/landing-pillars";
import { LandingProductMockup } from "@/components/landing/landing-product-mockup";
import { NS_SUITE_NAME, NEXTSTEP_COMPANY } from "@/lib/brand/ns-suite";
import { resolveLandingPath } from "@/lib/workspace/landing-path";
import { ensureUserDoc } from "@/lib/workspace/user";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { BTN_PRIMARY, BTN_PRIMARY_LG, BTN_SECONDARY_ON_DARK } from "@/lib/ui/nextstep";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";

export function LandingPage() {
  const locale = useLocale() as AppLocale;
  const tHero = useTranslations("landing.hero");
  const tProduct = useTranslations("landing.product");
  const tPillars = useTranslations("landing.pillars");
  const tTrust = useTranslations("landing.trust");
  const { user, loading } = useAuth();
  const year = new Date().getFullYear();

  useEffect(() => {
    if (loading || !user) return;
    void (async () => {
      await ensureUserDoc(user.uid, user.email ?? "", user.displayName ?? undefined);
      const path = await resolveLandingPath(user.uid);
      window.location.assign(`/${locale}${path.startsWith("/") ? path : `/${path}`}`);
    })();
  }, [user, loading, locale]);

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ns-hero">
        <p className="text-sm text-white/70">…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* —— Hero (dark) —— */}
      <div className="relative overflow-hidden bg-ns-hero text-white">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-ns-primary blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-ns-secondary blur-[120px]" />
        </div>

        <header className="relative z-10 flex items-center justify-between px-4 py-6 md:px-8">
          <div className="flex items-center gap-3">
            <NsMark size="md" />
            <div className="leading-tight">
              <span className="block text-sm font-bold tracking-tight text-white">
                {tHero("brand")}
              </span>
              <span className="block text-[10px] font-medium text-white/50">
                {NEXTSTEP_COMPANY} · {NS_SUITE_NAME}
              </span>
            </div>
          </div>
          <LanguageSwitcher variant="dark" />
        </header>

        <section className="relative z-10 mx-auto max-w-4xl px-4 pb-20 pt-4 md:px-8 md:pb-28">
          <h1 className="text-3xl font-bold leading-[1.12] tracking-tight md:text-5xl lg:text-6xl">
            {tHero("headline")}
          </h1>
          <p className="mt-6 max-w-2xl text-base font-medium leading-relaxed text-white/80 md:text-lg">
            {tHero("subheadline")}
          </p>
          <p className="mt-6 max-w-2xl border-l-4 border-ns-primary bg-white/5 py-3 pl-5 text-sm font-medium leading-relaxed text-white/90 md:text-base">
            {tHero("benefit")}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/signup" className={BTN_PRIMARY_LG}>
              {tHero("cta")}
            </Link>
            <Link href="/login" className={BTN_SECONDARY_ON_DARK}>
              {tHero("signIn")}
            </Link>
          </div>
        </section>
      </div>

      {/* —— Product preview —— */}
      <section
        className="relative bg-ns-brand-light px-4 py-16 md:px-8 md:py-24"
        aria-labelledby="landing-product-title"
      >
        <div className="mx-auto max-w-5xl">
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <h2
              id="landing-product-title"
              className="text-2xl font-bold tracking-tight text-ns-tertiary md:text-3xl"
            >
              {tProduct("title")}
            </h2>
            <p className="mt-4 text-sm font-medium leading-relaxed text-ns-secondary md:text-base">
              {tProduct("subtitle")}
            </p>
          </div>
          <div className="relative z-0 mt-10 md:mt-14">
            <LandingProductMockup />
          </div>
        </div>
      </section>

      {/* —— Three pillars —— */}
      <section
        className="bg-ns-background px-4 py-16 md:px-8 md:py-20"
        aria-labelledby="landing-pillars-title"
      >
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2
              id="landing-pillars-title"
              className="text-2xl font-bold tracking-tight text-ns-tertiary md:text-3xl"
            >
              {tPillars("title")}
            </h2>
            <p className="mt-4 text-sm font-medium leading-relaxed text-ns-secondary md:text-base">
              {tPillars("subtitle")}
            </p>
          </div>
          <LandingPillars />
        </div>
      </section>

      {/* —— Trust band —— */}
      <section className="bg-ns-hero px-4 py-14 text-white md:px-8 md:py-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
          <h2 className="text-xl font-bold leading-snug md:text-2xl">{tTrust("headline")}</h2>
          <p className="text-sm font-medium tracking-wide text-white/70 md:text-base">
            {tTrust("points")}
          </p>
          <Link href="/signup" className={BTN_PRIMARY}>
            {tTrust("cta")}
          </Link>
        </div>
      </section>

      <LandingFooter year={year} />
    </div>
  );
}
