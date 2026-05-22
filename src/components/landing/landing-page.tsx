"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { NsMark } from "@/components/brand/ns-mark";
import { AppFooter } from "@/components/layout/app-footer";
import { LandingAuthRedirect } from "@/components/landing/landing-auth-redirect";
import { MARKETING_LANDING_HREF } from "@/lib/brand/marketing";
import { useLazyAuthUser } from "@/hooks/use-lazy-auth-user";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { BTN_PRIMARY, BTN_PRIMARY_LG, BTN_SECONDARY_ON_DARK } from "@/lib/ui/nextstep";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";

const LandingProductMockup = dynamic(
  () =>
    import("@/components/landing/landing-product-mockup").then((m) => ({
      default: m.LandingProductMockup,
    })),
  {
    loading: () => (
      <div
        className="mx-auto h-96 w-full max-w-5xl animate-pulse rounded-2xl bg-white/40"
        aria-hidden
      />
    ),
  },
);

const LandingCapabilities = dynamic(
  () =>
    import("@/components/landing/landing-capabilities").then((m) => ({
      default: m.LandingCapabilities,
    })),
  {
    loading: () => (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    ),
  },
);

const LandingHowItWorks = dynamic(
  () =>
    import("@/components/landing/landing-how-it-works").then((m) => ({
      default: m.LandingHowItWorks,
    })),
  {
    loading: () => (
      <div className="h-32 animate-pulse rounded-2xl bg-gray-100" aria-hidden />
    ),
  },
);

function LandingRedirecting() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ns-hero">
      <p className="text-sm text-white/70">…</p>
    </div>
  );
}

type LandingPageProps = {
  isMarketing: boolean;
};

export function LandingPage({ isMarketing }: LandingPageProps) {
  const locale = useLocale() as AppLocale;
  const tHero = useTranslations("landing.hero");
  const tMarketing = useTranslations("landing.marketing");
  const tProduct = useTranslations("landing.product");
  const tCapabilities = useTranslations("landing.capabilities");
  const tHow = useTranslations("landing.howItWorks");
  const tTrust = useTranslations("landing.trust");
  const { user, ready } = useLazyAuthUser();

  const redirecting = ready && !!user && !isMarketing;

  if (redirecting && user) {
    return (
      <>
        <LandingAuthRedirect locale={locale} user={user} />
        <LandingRedirecting />
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="relative overflow-hidden bg-ns-hero text-white">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-ns-primary blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-ns-secondary blur-[120px]" />
        </div>

        <header className="relative z-10 px-4 py-6 md:px-8">
          {user && isMarketing && (
            <div className="mb-4 flex flex-wrap items-center justify-center gap-3 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-center text-sm">
              <span className="font-medium text-white/80">{tMarketing("signedIn")}</span>
              <Link
                href="/articles"
                className="font-semibold text-ns-primary underline-offset-2 hover:underline"
              >
                {tMarketing("backToApp")}
              </Link>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <Link
              href={MARKETING_LANDING_HREF}
              className="flex items-center gap-3 rounded-lg transition-opacity hover:opacity-90"
            >
              <NsMark size="md" />
              <span className="text-sm font-bold tracking-tight text-white">
                {tHero("brand")}
              </span>
            </Link>
            <LanguageSwitcher variant="dark" />
          </div>
        </header>

        <section className="relative z-10 mx-auto max-w-4xl px-4 pb-20 pt-4 md:px-8 md:pb-28">
          <p className="text-xs font-bold uppercase tracking-widest text-ns-primary">
            {tHero("languagesBadge")}
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-[1.12] tracking-tight md:text-5xl lg:text-6xl">
            {tHero("headline")}
          </h1>
          <p className="mt-3 max-w-2xl text-xl font-semibold leading-snug text-white/85 md:mt-4 md:text-2xl">
            {tHero("headlineSubtitle")}
          </p>
          <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-white/80 md:text-lg">
            {tHero("subheadline")}
          </p>
          <p className="mt-6 max-w-2xl border-l-4 border-ns-primary bg-white/5 py-3 pl-5 text-sm font-medium leading-relaxed text-white/90 md:text-base">
            {tHero("benefit")}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link href="/signup" className={BTN_PRIMARY_LG}>
              {tHero("cta")}
            </Link>
            <a href="#landing-product" className={BTN_SECONDARY_ON_DARK}>
              {tHero("ctaSecondary")}
            </a>
            <Link
              href="/login"
              className="text-center text-sm font-semibold text-white/80 underline-offset-2 hover:text-white hover:underline"
            >
              {tHero("signIn")}
            </Link>
          </div>
        </section>
      </div>

      <section
        id="landing-product"
        className="relative scroll-mt-20 bg-ns-brand-light px-4 pt-12 pb-10 md:px-8 md:pt-16 md:pb-12"
        aria-labelledby="landing-product-title"
      >
        <div className="mx-auto max-w-6xl">
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
          <div className="relative z-0 mt-6 md:mt-8">
            <LandingProductMockup />
          </div>
        </div>
      </section>

      <section
        className="bg-ns-background px-4 pt-10 pb-14 md:px-8 md:pt-12 md:pb-16"
        aria-labelledby="landing-how-title"
      >
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h2
              id="landing-how-title"
              className="text-2xl font-bold tracking-tight text-ns-tertiary md:text-3xl"
            >
              {tHow("title")}
            </h2>
            <p className="mt-4 text-sm font-medium leading-relaxed text-ns-secondary md:text-base">
              {tHow("subtitle")}
            </p>
          </div>
          <LandingHowItWorks />
        </div>
      </section>

      <section
        className="bg-ns-brand-light px-4 py-16 md:px-8 md:py-20"
        aria-labelledby="landing-capabilities-title"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-8 max-w-2xl text-center md:mb-10">
            <h2
              id="landing-capabilities-title"
              className="text-2xl font-bold tracking-tight text-ns-tertiary md:text-3xl"
            >
              {tCapabilities("title")}
            </h2>
            <p className="mt-4 text-sm font-medium leading-relaxed text-ns-secondary md:text-base">
              {tCapabilities("subtitle")}
            </p>
          </div>
          <LandingCapabilities />
        </div>
      </section>

      <section className="bg-ns-hero px-4 py-14 text-white md:px-8 md:py-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
          <h2 className="text-xl font-bold leading-snug md:text-2xl">{tTrust("headline")}</h2>
          <p className="max-w-2xl text-sm font-medium leading-relaxed tracking-wide text-white/70 md:text-base">
            {tTrust("points")}
          </p>
          <Link href="/signup" className={BTN_PRIMARY}>
            {tTrust("cta")}
          </Link>
        </div>
      </section>

      <AppFooter
        variant="dark"
        showAuthLinks={!user}
        showAppLinks={!!user && isMarketing}
      />
    </div>
  );
}
