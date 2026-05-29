import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Map legacy /clients path (after locale) to v3 route (no locale prefix). */
export function mapLegacyClientsRest(rest: string): string {
  const trimmed = rest.replace(/^\/+|\/+$/g, "");
  if (!trimmed) {
    return "/setup/llm";
  }

  const parts = trimmed.split("/").filter(Boolean);
  const sub = parts[1];

  switch (sub) {
    case "onboarding":
      return "/setup/author?tab=essential";
    case "brain":
      return "/persona";
    case "generate":
      return "/articles/new";
    case "history":
      return "/articles";
    default:
      return "/persona";
  }
}

/** Returns localized target path (e.g. /fr/persona) or null if not a legacy clients URL. */
export function resolveLegacyClientsRedirectPath(pathname: string): string | null {
  const withLocale = pathname.match(/^\/(en|fr|es)\/clients(?:\/(.*))?$/);
  if (withLocale) {
    const [, locale, rest = ""] = withLocale;
    const target = mapLegacyClientsRest(rest);
    return applyLocale(locale, target);
  }

  if (pathname === "/clients" || pathname.startsWith("/clients/")) {
    const rest = pathname.slice("/clients".length);
    const target = mapLegacyClientsRest(rest);
    return target;
  }

  return null;
}

function applyLocale(locale: string, target: string): string {
  const [path, query] = target.split("?");
  const localized = `/${locale}${path}`;
  return query ? `${localized}?${query}` : localized;
}

export function legacyClientsRedirectResponse(
  request: NextRequest,
): NextResponse | null {
  const target = resolveLegacyClientsRedirectPath(request.nextUrl.pathname);
  if (!target) return null;

  const url = request.nextUrl.clone();
  const [pathname, queryString] = target.split("?");
  url.pathname = pathname;
  url.search = "";
  if (queryString) {
    const params = new URLSearchParams(queryString);
    params.forEach((value, key) => url.searchParams.set(key, value));
  }
  return NextResponse.redirect(url);
}
