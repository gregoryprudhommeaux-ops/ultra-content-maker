import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { legacyClientsRedirectResponse } from "./lib/navigation/legacy-clients-redirect";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const legacyRedirect = legacyClientsRedirectResponse(request);
  if (legacyRedirect) {
    return legacyRedirect;
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|opengraph-image|.*\\..*).*)"],
};
