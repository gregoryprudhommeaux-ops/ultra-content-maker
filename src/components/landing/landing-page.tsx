"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { resolveLandingPath } from "@/lib/workspace/landing-path";
import { ensureUserDoc } from "@/lib/workspace/user";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui/nextstep";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";

export function LandingPage() {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("landing.hero");
  const { user, loading } = useAuth();

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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-ns-hero">
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-ns-primary blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-ns-secondary blur-[120px]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-4 py-6 md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-ns-primary font-black text-black">
            NS
          </div>
          <span className="text-sm font-black uppercase tracking-widest text-white">
            {t("brand")}
          </span>
        </div>
        <LanguageSwitcher variant="dark" />
      </header>

      <section className="relative z-10 mx-auto flex max-w-4xl flex-1 flex-col justify-center px-4 pb-16 pt-8 md:px-8">
        <h1 className="text-3xl font-black uppercase leading-[1.05] tracking-tighter text-white md:text-5xl lg:text-6xl">
          {t("headline")}
        </h1>
        <p className="mt-6 max-w-2xl text-base font-medium leading-relaxed text-white/80 md:text-lg">
          {t("subheadline")}
        </p>
        <p className="mt-6 max-w-2xl border-l-4 border-ns-primary bg-white/5 py-3 pl-5 text-sm font-medium leading-relaxed text-white/90 md:text-base">
          {t("benefit")}
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/signup" className={BTN_PRIMARY}>
            {t("cta")}
          </Link>
          <Link href="/login" className={BTN_SECONDARY}>
            {t("signIn")}
          </Link>
        </div>
      </section>
    </div>
  );
}
