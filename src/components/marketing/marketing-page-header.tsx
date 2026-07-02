"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { NsMark } from "@/components/brand/ns-mark";
import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";

type MarketingPageHeaderProps = {
  brand: string;
  homeHref?: string;
  signInLabel?: string;
  showSignIn?: boolean;
  topBanner?: ReactNode;
  borderless?: boolean;
};

export function MarketingPageHeader({
  brand,
  homeHref = "/",
  signInLabel,
  showSignIn = false,
  topBanner,
  borderless = false,
}: MarketingPageHeaderProps) {
  return (
    <header
      className={`bg-ns-hero text-white ${borderless ? "" : "border-b border-ns-border"}`}
    >
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-8">
        {topBanner}
        <div className="flex items-center justify-between gap-4">
          <Link href={homeHref} className="flex items-center gap-3 transition-opacity hover:opacity-90">
            <NsMark size="sm" />
            <span className="text-sm font-bold tracking-tight">{brand}</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            {showSignIn && signInLabel ? (
              <Link
                href="/login"
                className="text-sm font-semibold text-white/80 underline-offset-2 transition-colors hover:text-white hover:underline"
              >
                {signInLabel}
              </Link>
            ) : null}
            <LanguageSwitcher variant="dark" />
          </div>
        </div>
      </div>
    </header>
  );
}
