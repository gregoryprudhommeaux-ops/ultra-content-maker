import { redirect as nextRedirect } from "next/navigation";

/** Server-only redirect with locale prefix (do not import from navigation.ts). */
export function redirectWithLocale(href: string, locale: string): never {
  const path = href.startsWith("/") ? href : `/${href}`;
  const localized = path.startsWith(`/${locale}/`) || path === `/${locale}`
    ? path
    : `/${locale}${path}`;
  nextRedirect(localized);
}
