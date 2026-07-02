import type { AppLocale } from "@/i18n/routing";
import {
  notifyAdminLogin,
  type AdminLoginNotifyMeta,
} from "@/lib/firebase/notify-admin-login";
import { resolveLandingPath } from "@/lib/workspace/landing-path";
import { ensureUserDoc } from "@/lib/workspace/user";
import { clearGoogleRedirectPending } from "./google-redirect";

/** Full-page navigation so Firebase session is ready before RequireAuth runs. */
export function redirectAfterSignIn(locale: AppLocale, path = "/setup/express") {
  clearGoogleRedirectPending();
  const href = `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
  window.location.assign(href);
}

export async function redirectAfterSignInForUser(
  locale: AppLocale,
  userId: string,
  email: string,
  displayName?: string,
  notify?: AdminLoginNotifyMeta,
  inviteToken?: string | null,
) {
  await ensureUserDoc(userId, email, displayName);
  if (notify) {
    notifyAdminLogin(userId, { ...notify, locale });
  }
  if (inviteToken?.trim()) {
    redirectAfterSignIn(locale, `/invite/${inviteToken.trim()}`);
    return;
  }
  redirectAfterSignIn(locale, await resolveLandingPath(userId));
}
