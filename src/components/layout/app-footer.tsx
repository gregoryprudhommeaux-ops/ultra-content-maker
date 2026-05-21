"use client";

import { NsMark } from "@/components/brand/ns-mark";
import { MARKETING_LANDING_HREF } from "@/lib/brand/marketing";
import { NS_SUITE_NAME, NS_SUITE_URL, NEXTSTEP_COMPANY } from "@/lib/brand/ns-suite";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type AppFooterProps = {
  variant?: "dark" | "light";
  /** Show signup / login (marketing & auth) */
  showAuthLinks?: boolean;
  /** Show app shortcuts (dashboard: home + articles) */
  showAppLinks?: boolean;
};

export function AppFooter({
  variant = "dark",
  showAuthLinks = false,
  showAppLinks = false,
}: AppFooterProps) {
  const t = useTranslations("app.footer");
  const year = new Date().getFullYear();
  const isDark = variant === "dark";

  return (
    <footer
      className={
        isDark
          ? "border-t border-white/10 bg-ns-hero text-white/70"
          : "border-t border-gray-100 bg-ns-brand-light text-ns-secondary"
      }
    >
      <div
        className={`mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-10 ${
          isDark ? "pb-10 pl-14 md:pb-8 md:pl-0" : ""
        }`}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-3">
            <NsMark size="sm" className="mt-0.5 shrink-0" />
            <div className="min-w-0 space-y-1.5">
              <p
                className={`text-sm font-bold ${isDark ? "text-white" : "text-ns-tertiary"}`}
              >
                {NEXTSTEP_COMPANY}
              </p>
              <p
                className={`text-[11px] font-semibold uppercase tracking-wide ${
                  isDark ? "text-ns-primary" : "text-ns-secondary"
                }`}
              >
                {NS_SUITE_URL ? (
                  <a
                    href={NS_SUITE_URL}
                    className={isDark ? "hover:text-ns-primary/80" : "hover:text-ns-tertiary"}
                    rel="noopener noreferrer"
                  >
                    {NS_SUITE_NAME}
                  </a>
                ) : (
                  <span>{NS_SUITE_NAME}</span>
                )}
                <span
                  className={`font-medium normal-case tracking-normal ${
                    isDark ? "text-white/50" : "text-ns-secondary/80"
                  }`}
                >
                  {" "}
                  · {t("productName")}
                </span>
              </p>
              <p
                className={`text-xs font-medium leading-relaxed ${
                  isDark ? "text-white/60" : "text-ns-secondary"
                }`}
              >
                {t("tagline")}
              </p>
              <p className={`text-[11px] ${isDark ? "text-white/40" : "text-ns-secondary/70"}`}>
                {t("rights", { year })}
              </p>
            </div>
          </div>

          <nav
            className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold md:max-w-xs md:justify-end md:pt-1"
            aria-label="Footer"
          >
            {showAppLinks && (
              <>
                <Link
                  href={MARKETING_LANDING_HREF}
                  className={isDark ? "text-ns-primary hover:text-ns-primary/90" : "text-ns-tertiary hover:text-ns-primary"}
                >
                  {t("home")}
                </Link>
                <Link
                  href="/articles"
                  className={isDark ? "text-white/80 hover:text-white" : "text-ns-secondary hover:text-ns-tertiary"}
                >
                  {t("dashboard")}
                </Link>
              </>
            )}
            {showAuthLinks && (
              <>
                <Link
                  href="/signup"
                  className={isDark ? "text-ns-primary hover:text-ns-primary/90" : "text-ns-tertiary hover:text-ns-primary"}
                >
                  {t("signup")}
                </Link>
                <Link
                  href="/login"
                  className={isDark ? "text-white/80 hover:text-white" : "text-ns-secondary hover:text-ns-tertiary"}
                >
                  {t("login")}
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </footer>
  );
}
