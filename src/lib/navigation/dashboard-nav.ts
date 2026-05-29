import type { OnboardingProgress } from "@/lib/workspace/onboarding-progress";
import { resolveHomeHrefFromProgress } from "@/lib/workspace/onboarding-routes";

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

const LOCALE_PREFIXES = ["/en", "/fr", "/es"] as const;

/** Pathname without query, trailing slash, or locale prefix (for nav matching). */
export function normalizeDashboardPathname(pathname: string | null): string | null {
  if (!pathname) return null;
  let path = pathname.split("?")[0].replace(/\/$/, "") || "/";
  for (const locale of LOCALE_PREFIXES) {
    if (path === locale) return "/";
    if (path.startsWith(`${locale}/`)) {
      path = path.slice(locale.length) || "/";
      break;
    }
  }
  return path;
}

export function isDashboardNavActive(
  item: DashboardNavItem,
  pathname: string | null,
): boolean {
  const path = normalizeDashboardPathname(pathname);
  if (!path) return false;
  pathname = path;
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

/** Creation assistant entry — same URL as Accueil when `canAccessCreation`. */
export function isCreationHubPath(pathname: string | null): boolean {
  const path = normalizeDashboardPathname(pathname);
  if (!path) return false;
  return path === "/articles/new" || path.startsWith("/articles/new/");
}

/**
 * Nav highlight aligned with dynamic Accueil href (`resolveHomeHrefFromProgress`).
 * When Accueil points to `/articles/new`, only Accueil is active on that route.
 */
export function resolveDashboardNavActive(
  item: DashboardNavItem,
  pathname: string | null,
  progress: OnboardingProgress | null | undefined,
  options?: { creationHubIsHome?: boolean },
): boolean {
  const path = normalizeDashboardPathname(pathname);
  if (!path) return false;

  const homeHref = resolveHomeHrefFromProgress(progress);
  const creationHubIsHome =
    options?.creationHubIsHome ?? homeHref === "/articles/new";

  if (creationHubIsHome && isCreationHubPath(path)) {
    if (item.key === "home") return true;
    if (item.key === "create") return false;
  }

  if (item.key === "home") {
    return (
      path === homeHref ||
      path.startsWith(`${homeHref}/`) ||
      (homeHref === "/articles/new" && isCreationHubPath(path)) ||
      path === "/start" ||
      path.startsWith("/start/")
    );
  }

  return isDashboardNavActive(item, pathname);
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
