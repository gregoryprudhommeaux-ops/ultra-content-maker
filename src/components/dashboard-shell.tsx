"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useAuth } from "@/components/auth/auth-provider";
import { META_LABEL } from "@/lib/ui/nextstep";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

const NAV = [
  { href: "/setup/author", labelKey: "setup" as const },
  { href: "/persona", labelKey: "persona" as const },
  { href: "/articles", labelKey: "articles" as const },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const { signOut } = useAuth();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-ns-background">
      <header className="sticky top-0 z-50 w-full border-b border-ns-hero/20 bg-ns-hero px-4 py-3 text-white shadow-sm md:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/articles" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-ns-primary font-black text-sm text-black">
              NS
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              {t("app.name")}
            </span>
          </Link>
          <div className="flex items-center gap-4 md:gap-6">
            <nav className="hidden gap-6 md:flex">
              {NAV.map(({ href, labelKey }) => {
                const active =
                  pathname === href || pathname?.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`${META_LABEL} transition-colors ${
                      active
                        ? "text-ns-primary"
                        : "text-white/70 hover:text-ns-primary"
                    }`}
                  >
                    {t(`nav.${labelKey}`)}
                  </Link>
                );
              })}
              <Link
                href="/setup/llm"
                className={`${META_LABEL} transition-colors ${
                  pathname?.startsWith("/setup/llm")
                    ? "text-ns-primary"
                    : "text-white/70 hover:text-ns-primary"
                }`}
              >
                {t("nav.settings")}
              </Link>
            </nav>
            <LanguageSwitcher variant="dark" />
            <button
              type="button"
              onClick={() => signOut()}
              className={`${META_LABEL} text-white/60 transition-colors hover:text-ns-primary`}
            >
              {t("nav.signOut")}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}
