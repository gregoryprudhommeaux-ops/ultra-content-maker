import type { OnboardingProgress } from "@/lib/workspace/onboarding-progress";
import { CREATION_FRESH_PARAM } from "@/lib/articles/creation-wizard-session";

export const DASHBOARD_HUB_PATH = "/dashboard";

export const CREATE_HUB_PATH = "/articles/new";
export const CREATE_FRESH_HREF = `${CREATE_HUB_PATH}?${CREATION_FRESH_PARAM}=1`;

export type DashboardNavKey =
 | "create"
 | "library"
 | "profile"
 | "settings"
 | "admin";

/** Hidden from the top header — available in the left sidebar shortcuts. */
export const SIDEBAR_ONLY_NAV_KEYS: readonly DashboardNavKey[] = [
  "create",
  "library",
  "profile",
];

export type DashboardNavItem = {
 key: DashboardNavKey;
 href: string;
 labelKey: DashboardNavKey;
 match: readonly string[];
 /** Path prefixes that must not activate this item (e.g. /articles/new under /articles). */
 exclude?: readonly string[];
};

export const DASHBOARD_NAV: readonly DashboardNavItem[] = [
 {
 key: "create",
 href: CREATE_FRESH_HREF,
 labelKey: "create",
 match: [CREATE_HUB_PATH],
 },
 {
 key: "library",
 href: DASHBOARD_HUB_PATH,
 labelKey: "library",
 match: [DASHBOARD_HUB_PATH, "/articles"],
 exclude: ["/articles/new"],
 },
 {
 key: "profile",
 href: "/setup/author",
 labelKey: "profile",
 match: ["/setup/express", "/setup/author", "/setup/audience", "/persona"],
 },
 { key: "settings", href: "/setup/llm", labelKey: "settings", match: ["/setup/llm"] },
 {
 key: "admin",
 href: "/admin/analytics",
 labelKey: "admin",
 match: ["/admin"],
 },
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

/** Creation assistant entry · same URL as Accueil when `canAccessCreation`. */
export function isCreationHubPath(pathname: string | null): boolean {
 const path = normalizeDashboardPathname(pathname);
 if (!path) return false;
 return path === "/articles/new" || path.startsWith("/articles/new/");
}

/** Accueil = landing `/` · Créer = `/articles/new` · hub setup = `/start`. */
export function resolveDashboardNavActive(
 item: DashboardNavItem,
 pathname: string | null,
 _progress?: OnboardingProgress | null | undefined,
): boolean {
 const path = normalizeDashboardPathname(pathname);
 if (!path) return false;

 if (item.key === "create") {
 return isCreationHubPath(path);
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
