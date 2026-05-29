import type { OnboardingProgress } from "@/lib/workspace/onboarding-progress";

export type DashboardNavKey = "home" | "create" | "library" | "profile" | "settings";

export type DashboardNavItem = {
  key: DashboardNavKey;
  href: string;
  labelKey: DashboardNavKey;
  match: readonly string[];
  /** Path prefixes that must not activate this item (e.g. /articles/new under /articles). */
  exclude?: readonly string[];
};

export const DASHBOARD_NAV: readonly DashboardNavItem[] = [
  { key: "home", href: "/start", labelKey: "home", match: ["/start"] },
  {
    key: "create",
    href: "/articles/new",
    labelKey: "create",
    match: ["/articles/new"],
  },
  {
    key: "library",
    href: "/articles",
    labelKey: "library",
    match: ["/articles"],
    exclude: ["/articles/new"],
  },
  {
    key: "profile",
    href: "/setup/author",
    labelKey: "profile",
    match: ["/setup/author", "/setup/audience", "/persona"],
  },
  { key: "settings", href: "/setup/llm", labelKey: "settings", match: ["/setup/llm"] },
] as const;

export function isDashboardNavActive(
  item: DashboardNavItem,
  pathname: string | null,
): boolean {
  if (!pathname) return false;
  if (
    item.exclude?.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return false;
  }
  return item.match.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Small dot when setup attention is needed on this nav item. */
export function dashboardNavNeedsAttention(
  key: DashboardNavKey,
  progress: OnboardingProgress | null,
): boolean {
  if (!progress || progress.completion.isOnboardingComplete) return false;

  switch (key) {
    case "home":
      return progress.percent < 100;
    case "profile":
      return (
        !progress.completion.hasProfileMinimum ||
        !progress.completion.hasAudience ||
        !progress.completion.hasPersonaValidated
      );
    case "settings":
      return !progress.completion.hasApiKey;
    case "create":
      return !progress.canAccessCreation;
    default:
      return false;
  }
}
