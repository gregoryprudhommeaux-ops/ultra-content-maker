"use client";

import { NsMark } from "@/components/brand/ns-mark";
import { NEXTSTEP_COMPANY, NS_SUITE_NAME } from "@/lib/brand/ns-suite";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useAuth } from "@/components/auth/auth-provider";
import { META_LABEL } from "@/lib/ui/nextstep";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";

const NAV = [
  { href: "/articles", labelKey: "content" as const, match: ["/articles"] },
  {
    href: "/setup/author",
    labelKey: "profile" as const,
    match: ["/setup/author", "/setup/audience", "/persona"],
  },
  { href: "/setup/llm", labelKey: "settings" as const, match: ["/setup/llm"] },
] as const;

function navLinkClass(active: boolean) {
  return `${META_LABEL} transition-colors ${
    active ? "text-ns-primary" : "text-white/70 hover:text-ns-primary"
  }`;
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const { signOut } = useAuth();
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

  function isActive(match: readonly string[]) {
    if (!pathname) return false;
    return match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
  }

  return (
    <div className="min-h-screen bg-ns-background">
      <header className="sticky top-0 z-50 w-full border-b border-ns-hero/20 bg-ns-hero px-4 py-3 text-white shadow-sm md:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link href="/articles" className="flex min-w-0 items-center gap-3">
            <NsMark size="sm" />
            <div className="min-w-0 leading-tight">
              <span className="block truncate text-base font-bold tracking-tight text-white md:text-lg">
                {t("app.name")}
              </span>
              <span className="block truncate text-[10px] font-medium text-white/50">
                {NEXTSTEP_COMPANY} · {NS_SUITE_NAME}
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2 md:gap-6">
            <nav className="hidden gap-6 md:flex" aria-label="Main">
              {NAV.map(({ href, labelKey, match }) => (
                <Link
                  key={href}
                  href={href}
                  className={navLinkClass(isActive(match))}
                >
                  {t(`nav.${labelKey}`)}
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
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 text-white md:hidden"
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
        <div className="fixed inset-0 z-40 md:hidden">
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
            {NAV.map(({ href, labelKey, match }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-3 text-sm font-semibold transition-colors ${
                  isActive(match)
                    ? "bg-ns-primary/15 text-ns-primary"
                    : "text-white/85 hover:bg-white/5"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {t(`nav.${labelKey}`)}
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

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}
