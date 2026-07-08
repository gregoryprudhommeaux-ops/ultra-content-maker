"use client";

import { NsMark } from "@/components/brand/ns-mark";
import { AppFooter } from "@/components/layout/app-footer";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useAuth } from "@/components/auth/auth-provider";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { useOnboardingProgress } from "@/contexts/onboarding-progress-context";
import {
  DASHBOARD_NAV,
  dashboardNavNeedsAttention,
  isCreationHubPath,
  resolveDashboardNavActive,
  type DashboardNavItem,
} from "@/lib/navigation/dashboard-nav";
import { dispatchCreationFreshStart } from "@/lib/articles/creation-wizard-session";
import { AccountSwitcher } from "@/components/workspace/account-switcher";
import { AgencyWorkspaceBanner } from "@/components/workspace/agency-workspace-banner";
import { AgencyHeaderPill, useAgencyManagedContext } from "@/components/workspace/agency-header-pill";
import { DashboardSidebarNav } from "@/components/navigation/dashboard-sidebar-nav";
import { resolveHomeHrefFromProgress } from "@/lib/workspace/onboarding-routes";
import { META_LABEL } from "@/lib/ui/nextstep";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";

function navLinkClass(active: boolean) {
  return `shrink-0 whitespace-nowrap rounded-md px-1.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] transition-colors xl:px-2 ${
    active
      ? "bg-ns-primary/15 text-ns-primary shadow-[inset_0_0_0_1px_rgba(157,196,26,0.35)]"
      : "text-white/70 hover:bg-white/5 hover:text-ns-primary"
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
  const isPlatformAdmin = usePlatformAdmin();
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

  function renderNavLabel(
    labelKey: (typeof DASHBOARD_NAV)[number]["labelKey"],
    active: boolean,
  ) {
    const needsAttention = dashboardNavNeedsAttention(labelKey, progress) && !active;
    return (
      <>
        {t(`nav.${labelKey}`)}
        {needsAttention && <NavAttentionDot />}
      </>
    );
  }

  function navItemHref(item: DashboardNavItem) {
    if (item.key === "home") {
      return resolveHomeHrefFromProgress(progress);
    }
    return item.href;
  }

  function isNavItemActive(item: DashboardNavItem) {
    return resolveDashboardNavActive(item, pathname, progress);
  }

  function handleNavItemClick(
    e: React.MouseEvent<HTMLAnchorElement>,
    item: DashboardNavItem,
    onAfter?: () => void,
  ) {
    if (item.key === "create" && isCreationHubPath(pathname)) {
      e.preventDefault();
      dispatchCreationFreshStart();
    }
    onAfter?.();
  }

  const logoHref = resolveHomeHrefFromProgress(progress);

  const navItems = DASHBOARD_NAV.filter(
    (item) => item.key !== "admin" || isPlatformAdmin,
  );

  const isAdminRoute = pathname?.includes("/admin");
  const isAgencyManagedContext = useAgencyManagedContext();

  return (
    <div className="flex min-h-screen flex-col bg-ns-background lg:[--dashboard-header-h:57px]">
      <header className="sticky top-0 z-50 w-full border-b border-ns-hero/20 bg-ns-hero px-3 py-2.5 text-white shadow-sm sm:px-4 sm:py-3 md:px-6 lg:px-8">
        <div className="flex w-full items-center justify-between gap-2 lg:gap-3">
          <Link
            href={logoHref}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ns-primary sm:flex-none xl:gap-3"
            aria-label={t("nav.home")}
          >
            <NsMark size="sm" />
            <span className="hidden truncate text-sm font-bold tracking-tight text-white sm:inline xl:text-base">
              {t("app.name")}
            </span>
          </Link>
          <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-1.5 lg:min-w-0 lg:flex-1 lg:gap-3">
            <nav className="hidden min-w-0 flex-1 justify-end gap-1.5 lg:flex xl:gap-2.5" aria-label="Main">
              {navItems.map((item) => {
                const active = isNavItemActive(item);
                return (
                <Link
                  key={item.key}
                  href={navItemHref(item)}
                  className={navLinkClass(active)}
                  aria-current={active ? "page" : undefined}
                  onClick={(e) => handleNavItemClick(e, item)}
                >
                  {renderNavLabel(item.labelKey, active)}
                </Link>
              );
              })}
            </nav>
            <div className="hidden md:block">
              <AgencyHeaderPill />
            </div>
            <LanguageSwitcher variant="dark" className="hidden sm:flex" />
            <button
              type="button"
              onClick={() => signOut()}
              className="hidden shrink-0 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.14em] text-white/60 transition-colors hover:text-ns-primary md:inline"
            >
              {t("nav.signOut")}
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/20 text-white sm:h-10 sm:w-10 lg:hidden"
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
        <div className="mt-2 md:hidden">
          <AgencyHeaderPill layout="mobile-bar" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
      <aside className="sticky top-[var(--dashboard-header-h)] hidden h-[calc(100vh-var(--dashboard-header-h))] w-60 shrink-0 flex-col border-r border-white/10 bg-ns-hero lg:flex">
        <AccountSwitcher />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DashboardSidebarNav />
        </div>
        {isPlatformAdmin && (
          <nav className="mt-auto flex flex-col gap-1 border-t border-white/10 px-3 py-3" aria-label="Admin">
            <p className={`${META_LABEL} mb-1 px-2 text-white/45`}>{t("nav.admin")}</p>
            <Link
              href="/admin/analytics"
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                isAdminRoute
                  ? "bg-ns-primary/15 text-ns-primary shadow-[inset_0_0_0_1px_rgba(157,196,26,0.35)]"
                  : "text-white/85 hover:bg-white/5 hover:text-ns-primary"
              }`}
            >
              {t("adminAnalytics.shortNav")}
            </Link>
          </nav>
        )}
      </aside>

      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col ${
          isAgencyManagedContext
            ? "border-l-4 border-amber-400/80 bg-gradient-to-r from-amber-50/50 via-amber-50/20 to-ns-background"
            : ""
        }`}
      >

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
            className="absolute right-0 top-0 flex h-full w-[min(100%,300px)] flex-col border-l border-white/10 bg-ns-hero pb-8 pt-[4.75rem] shadow-xl sm:pt-16"
            aria-label="Main"
          >
            <div className="px-1">
              <AccountSwitcher />
            </div>
            <DashboardSidebarNav
              className="border-b border-white/10 pb-4"
              onNavigate={() => setMenuOpen(false)}
            />
            {isPlatformAdmin && (
              <Link
                href="/admin/analytics"
                className={`mx-4 mb-2 rounded-lg px-3 py-3 text-sm font-semibold transition-colors ${
                  isAdminRoute
                    ? "bg-ns-primary/15 text-ns-primary"
                    : "text-white/85 hover:bg-white/5 hover:text-ns-primary"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {t("adminAnalytics.shortNav")}
              </Link>
            )}
            <nav className="flex flex-col gap-1 px-4">
            {navItems.map((item) => {
              const active = isNavItemActive(item);
              return (
              <Link
                key={item.key}
                href={navItemHref(item)}
                className={`rounded-lg px-3 py-3 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-ns-primary/15 text-ns-primary shadow-[inset_0_0_0_1px_rgba(157,196,26,0.35)]"
                    : "text-white/85 hover:bg-white/5 hover:text-ns-primary"
                }`}
                aria-current={active ? "page" : undefined}
                onClick={(e) => handleNavItemClick(e, item, () => setMenuOpen(false))}
              >
                {renderNavLabel(item.labelKey, active)}
              </Link>
            );
            })}
            </nav>
            <button
              type="button"
              className="mx-4 mt-4 rounded-lg px-3 py-3 text-left text-sm font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-ns-primary"
              onClick={() => {
                setMenuOpen(false);
                signOut();
              }}
            >
              {t("nav.signOut")}
            </button>
            <div className="mx-4 mt-4 border-t border-white/10 pt-4 sm:hidden">
              <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                {t("nav.language", { defaultValue: "Language" })}
              </p>
              <LanguageSwitcher variant="dark" />
            </div>
          </nav>
        </div>
      )}

      <main
        className={`mx-auto w-full flex-1 px-3 py-4 sm:px-4 sm:py-8 md:px-6 ${
          isAdminRoute ? "max-w-[1400px]" : "max-w-5xl"
        }`}
      >
        <AgencyWorkspaceBanner />
        {children}
      </main>
      <AppFooter variant="light" showAppLinks />
      </div>
      </div>
    </div>
  );
}
