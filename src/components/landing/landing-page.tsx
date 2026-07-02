"use client";

import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import {
  MarketingIntroParagraph,
  MarketingPageIntro,
} from "@/components/marketing/marketing-page-intro";
import { AppFooter } from "@/components/layout/app-footer";
import { APP_HOME_PATH } from "@/lib/workspace/onboarding-routes";
import { useLazyAuthUser } from "@/hooks/use-lazy-auth-user";
import { Link } from "@/i18n/navigation";
import { BTN_PRIMARY, BTN_PRIMARY_LG, BTN_SECONDARY_ON_DARK } from "@/lib/ui/nextstep";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";

const LandingProductMockup = dynamic(
  () =>
    import("@/components/landing/landing-product-mockup").then((m) => ({
      default: m.LandingProductMockup,
    })),
  {
    loading: () => (
      <div
        className="mx-auto h-96 w-full max-w-5xl animate-pulse rounded-2xl bg-ns-brand-light"
        aria-hidden
      />
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
      <div className="h-32 animate-pulse rounded-2xl bg-ns-brand-light" aria-hidden />
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
      <div className="h-48 animate-pulse rounded-2xl bg-ns-brand-light" aria-hidden />
    ),
  },
);

type LandingPageProps = {
  isMarketing: boolean;
};

export function LandingPage({ isMarketing }: LandingPageProps) {
  const tHero = useTranslations("landing.hero");
  const tMarketing = useTranslations("landing.marketing");
  const tProduct = useTranslations("landing.product");
  const tCapabilities = useTranslations("landing.capabilities");
  const tHow = useTranslations("landing.howItWorks");
  const tTrust = useTranslations("landing.trust");
  const { user } = useLazyAuthUser();

  const signedInBanner = user ? (
    <div className="mb-4 flex flex-wrap items-center justify-center gap-3 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-center text-sm">
      <span className="font-medium text-white/80">{tMarketing("signedIn")}</span>
      <Link
        href="/articles/new"
        className="font-semibold text-ns-primary underline-offset-2 hover:underline"
      >
        {tMarketing("backToApp")}
      </Link>
    </div>
  ) : null;

  return (
    <div className="flex min-h-screen flex-col bg-ns-background">
      <MarketingPageHeader
        brand={tHero("brand")}
        homeHref={APP_HOME_PATH}
        signInLabel={tHero("signIn")}
        showSignIn={!user}
        topBanner={signedInBanner}
        borderless
      />

      <section className="relative overflow-hidden bg-ns-hero text-white">
        <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden>
          <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-ns-primary blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-ns-secondary blur-[120px]" />
        </div>

        <div className="relative px-4 pb-14 pt-10 md:px-8 md:pb-20 md:pt-12">
          <div className="mx-auto max-w-3xl text-center">
            <MarketingPageIntro
              eyebrow={tHero("eyebrow")}
              title={tHero("headline")}
              variant="dark"
              className="max-w-none"
            >
              <p className="mx-auto max-w-2xl text-pretty text-base leading-relaxed text-white/75 md:text-lg">
                {tHero("headlineSubtitle")}
              </p>
            </MarketingPageIntro>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link href="/signup" className={`${BTN_PRIMARY_LG} w-full sm:w-auto sm:min-w-[13rem]`}>
                {tHero("cta")}
              </Link>
              <Link
                href="/pricing"
                className={`${BTN_SECONDARY_ON_DARK} w-full sm:w-auto sm:min-w-[13rem]`}
              >
                {tHero("ctaPricing")}
              </Link>
            </div>

            <p className="mt-5 text-sm font-medium text-white/55">{tHero("microTrust")}</p>
          </div>
        </div>
      </section>

      <section
        id="landing-product"
        className="scroll-mt-20 border-t border-ns-border bg-ns-brand-light/50 px-4 py-14 md:px-8 md:py-16"
        aria-labelledby="landing-product-title"
      >
        <div className="mx-auto max-w-6xl">
          <MarketingPageIntro
            eyebrow={tProduct("eyebrow")}
            title={tProduct("title")}
            className="max-w-2xl"
          >
            <MarketingIntroParagraph>{tProduct("subtitle")}</MarketingIntroParagraph>
          </MarketingPageIntro>
          <div className="mt-10">
            <LandingProductMockup />
          </div>
        </div>
      </section>

      <section
        className="border-t border-ns-border px-4 py-14 md:px-8 md:py-16"
        aria-labelledby="landing-capabilities-title"
      >
        <div className="mx-auto max-w-6xl">
          <MarketingPageIntro
            eyebrow={tCapabilities("eyebrow")}
            title={tCapabilities("title")}
            className="mb-10 max-w-3xl"
          >
            <MarketingIntroParagraph>{tCapabilities("subtitle")}</MarketingIntroParagraph>
          </MarketingPageIntro>
          <LandingCapabilities />
        </div>
      </section>

      <section
        className="border-t border-ns-border px-4 py-14 md:px-8 md:py-16"
        aria-labelledby="landing-how-title"
      >
        <div className="mx-auto max-w-5xl">
          <MarketingPageIntro eyebrow={tHow("eyebrow")} title={tHow("title")} className="mb-10">
            <MarketingIntroParagraph>{tHow("subtitle")}</MarketingIntroParagraph>
          </MarketingPageIntro>
          <LandingHowItWorks />
        </div>
      </section>

      <section className="border-t border-ns-border bg-ns-hero px-4 py-14 text-white md:px-8 md:py-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
          <h2 className="text-balance text-lg font-bold uppercase tracking-wider text-ns-primary">
            {tTrust("headline")}
          </h2>
          <p className="max-w-2xl text-balance text-xl font-bold leading-snug text-white md:text-2xl">
            {tTrust("points")}
          </p>
          <p className="max-w-xl text-sm leading-relaxed text-white/70">{tTrust("subpoints")}</p>
          <Link href="/signup" className={BTN_PRIMARY}>
            {tTrust("cta")}
          </Link>
        </div>
      </section>

      <AppFooter variant="dark" showAuthLinks={!user} showAppLinks={!!user} />
    </div>
  );
}
