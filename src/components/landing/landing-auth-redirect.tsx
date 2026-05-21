"use client";

import { resolveLandingPath } from "@/lib/workspace/landing-path";
import { ensureUserDoc } from "@/lib/workspace/user";
import type { AppLocale } from "@/i18n/routing";
import type { User } from "firebase/auth";
import { useEffect } from "react";

type LandingAuthRedirectProps = {
  locale: AppLocale;
  user: User;
};

/** Redirect signed-in users from the public home to their app entry route. */
export function LandingAuthRedirect({ locale, user }: LandingAuthRedirectProps) {
  useEffect(() => {
    void (async () => {
      await ensureUserDoc(user.uid, user.email ?? "", user.displayName ?? undefined);
      const path = await resolveLandingPath(user.uid);
      window.location.assign(`/${locale}${path.startsWith("/") ? path : `/${path}`}`);
    })();
  }, [locale, user]);

  return null;
}
