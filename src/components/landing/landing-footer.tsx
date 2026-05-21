"use client";

import { NsMark } from "@/components/brand/ns-mark";
import { NS_SUITE_NAME, NS_SUITE_URL, NEXTSTEP_COMPANY } from "@/lib/brand/ns-suite";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type LandingFooterProps = {
  year: number;
};

export function LandingFooter({ year }: LandingFooterProps) {
  const t = useTranslations("landing.footer");

  return (
    <footer className="border-t border-white/10 bg-ns-hero px-4 py-10 text-white/70 md:px-8 md:py-12">
      {/* Extra left/bottom padding clears the Next.js dev indicator (bottom-left) in local dev */}
      <div className="mx-auto max-w-5xl pb-6 pl-14 md:pb-0 md:pl-0">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-4">
            <NsMark size="md" className="mt-0.5" />
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-bold text-white">{NEXTSTEP_COMPANY}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ns-primary">
                {NS_SUITE_URL ? (
                  <a
                    href={NS_SUITE_URL}
                    className="hover:text-ns-primary/80"
                    rel="noopener noreferrer"
                  >
                    {NS_SUITE_NAME}
                  </a>
                ) : (
                  <span>{NS_SUITE_NAME}</span>
                )}
                <span className="font-medium normal-case tracking-normal text-white/50">
                  {" "}
                  · {t("productName")}
                </span>
              </p>
              <p className="text-xs font-medium leading-relaxed text-white/60">
                {t("tagline")}
              </p>
              <p className="text-[11px] text-white/40">{t("rights", { year })}</p>
            </div>
          </div>

          <nav
            className="flex flex-wrap gap-4 text-sm font-semibold md:pt-1"
            aria-label="Footer"
          >
            <Link href="/signup" className="text-ns-primary hover:text-ns-primary/90">
              {t("signup")}
            </Link>
            <Link href="/login" className="text-white/80 hover:text-white">
              {t("login")}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
