import type { AppLocale } from "@/i18n/routing";
import { resolveLandingPath } from "@/lib/workspace/landing-path";
import { ensureUserDoc } from "@/lib/workspace/user";
import { clearGoogleRedirectPending } from "./google-redirect";

/** Full-page navigation so Firebase session is ready before RequireAuth runs. */
export function redirectAfterSignIn(locale: AppLocale, path = "/setup/author") {
  clearGoogleRedirectPending();
  const href = `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
  window.location.assign(href);
}

export async function redirectAfterSignInForUser(
  locale: AppLocale,
  userId: string,
  email: string,
  displayName?: string,
) {
  await ensureUserDoc(userId, email, displayName);
  redirectAfterSignIn(locale, await resolveLandingPath(userId));
}
