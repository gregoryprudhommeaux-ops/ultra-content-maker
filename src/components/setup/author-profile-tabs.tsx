"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export type AuthorProfileTab = "essential" | "voice" | "inspirations";

const TABS: AuthorProfileTab[] = ["essential", "voice", "inspirations"];

const TAB_SHELL =
  "inline-flex w-full max-w-lg rounded-lg border border-ns-alternate bg-ns-brand-light p-1";
const TAB_ACTIVE =
  "flex-1 rounded-md bg-ns-surface px-3 py-2 text-center text-sm font-semibold text-ns-tertiary shadow-sm";
const TAB_IDLE =
  "flex-1 rounded-md px-3 py-2 text-center text-sm font-medium text-ns-secondary transition-colors hover:text-ns-tertiary";

type Props = {
  active: AuthorProfileTab;
  /** Preserved query string without leading ? (e.g. from=articles). */
  querySuffix?: string;
};

export function AuthorProfileTabs({ active, querySuffix = "" }: Props) {
  const t = useTranslations("setup.author.tabs");

  function hrefFor(tab: AuthorProfileTab) {
    const params = new URLSearchParams({ tab });
    if (querySuffix) {
      for (const part of querySuffix.split("&")) {
        const [key, value] = part.split("=");
        if (key && value) params.set(key, decodeURIComponent(value));
      }
    }
    return `/setup/author?${params.toString()}`;
  }

  return (
    <nav className={TAB_SHELL} role="tablist" aria-label={t("ariaLabel")}>
      {TABS.map((tab) => (
        <Link
          key={tab}
          href={hrefFor(tab)}
          role="tab"
          aria-selected={active === tab}
          className={active === tab ? TAB_ACTIVE : TAB_IDLE}
        >
          {t(tab)}
        </Link>
      ))}
    </nav>
  );
}

export function parseAuthorTab(value: string | null): AuthorProfileTab {
  if (value === "voice" || value === "inspirations") return value;
  return "essential";
}
