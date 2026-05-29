"use client";

import { NsMark } from "@/components/brand/ns-mark";
import { AppFooter } from "@/components/layout/app-footer";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useAuth } from "@/components/auth/auth-provider";
import { useOnboardingProgress } from "@/contexts/onboarding-progress-context";
import {
  DASHBOARD_NAV,
  dashboardNavNeedsAttention,
  isDashboardNavActive,
} from "@/lib/navigation/dashboard-nav";
import { META_LABEL } from "@/lib/ui/nextstep";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";

function navLinkClass(active: boolean) {
  return `${META_LABEL} transition-colors ${
    active ? "text-ns-primary" : "text-white/70 hover:text-ns-primary"
  }`;
}

function NavAttentionDot() {
  return (
    <span
      className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-ns-primary align-middle"
      aria-hidden
    />
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const { signOut } = useAuth();
  const { progress } = useOnboardingProgress();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function renderNavLabel(labelKey: (typeof DASHBOARD_NAV)[number]["labelKey"]) {
    const needsAttention = dashboardNavNeedsAttention(labelKey, progress);
    return (
      <>
        {t(`nav.${labelKey}`)}
        {needsAttention && <NavAttentionDot />}
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-ns-background">
      <header className="sticky top-0 z-50 w-full border-b border-ns-hero/20 bg-ns-hero px-4 py-3 text-white shadow-sm md:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link
            href="/start"
            className="flex min-w-0 items-center gap-3 rounded-lg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ns-primary"
            aria-label={t("nav.home")}
          >
            <NsMark size="sm" />
            <span className="truncate text-base font-bold tracking-tight text-white md:text-lg">
              {t("app.name")}
            </span>
          </Link>
          <div className="flex items-center gap-2 md:gap-6">
            <nav className="hidden gap-5 lg:flex" aria-label="Main">
              {DASHBOARD_NAV.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={navLinkClass(isDashboardNavActive(item, pathname))}
                  aria-current={isDashboardNavActive(item, pathname) ? "page" : undefined}
                >
                  {renderNavLabel(item.labelKey)}
                </Link>
              ))}
            </nav>
            <LanguageSwitcher variant="dark" />
            <button
              type="button"
              onClick={() => signOut()}
              className={`${META_LABEL} hidden text-white/60 transition-colors hover:text-ns-primary sm:inline`}
            >
              {t("nav.signOut")}
            </button>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 text-white lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="dashboard-mobile-nav"
              aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label={t("nav.closeMenu")}
            onClick={() => setMenuOpen(false)}
          />
          <nav
            id="dashboard-mobile-nav"
            className="absolute right-0 top-0 flex h-full w-[min(100%,280px)] flex-col gap-1 border-l border-white/10 bg-ns-hero px-4 pb-8 pt-20 shadow-xl"
            aria-label="Main"
          >
            {DASHBOARD_NAV.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`rounded-lg px-3 py-3 text-sm font-semibold transition-colors ${
                  isDashboardNavActive(item, pathname)
                    ? "bg-ns-primary/15 text-ns-primary"
                    : "text-white/85 hover:bg-white/5"
                }`}
                aria-current={isDashboardNavActive(item, pathname) ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {renderNavLabel(item.labelKey)}
              </Link>
            ))}
            <button
              type="button"
              className="mt-4 rounded-lg px-3 py-3 text-left text-sm font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-ns-primary"
              onClick={() => {
                setMenuOpen(false);
                signOut();
              }}
            >
              {t("nav.signOut")}
            </button>
          </nav>
        </div>
      )}

      <main className="mx-auto max-w-5xl flex-1 px-4 py-8 md:px-6">{children}</main>
      <AppFooter variant="light" showAppLinks />
    </div>
  );
}
