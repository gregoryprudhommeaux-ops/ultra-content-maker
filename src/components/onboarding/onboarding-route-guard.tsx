"use client";

import { useOnboardingProgress } from "@/contexts/onboarding-progress-context";
import { isPathLockedForProgress } from "@/lib/workspace/onboarding-status";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Redirects when the user opens a setup step that is still locked
 * (e.g. /persona before profile is complete).
 */
export function OnboardingRouteGuard({ children }: { children: ReactNode }) {
  const t = useTranslations("setup.onboarding.guard");
  const pathname = usePathname();
  const router = useRouter();
  const { progress, status, loading } = useOnboardingProgress();
  const didRedirect = useRef(false);

  const locked =
    Boolean(progress) && isPathLockedForProgress(pathname, progress!);
  const redirectHref = status?.nextHref;

  useEffect(() => {
    didRedirect.current = false;
  }, [pathname]);

  useEffect(() => {
    if (loading || !locked || !redirectHref || didRedirect.current) return;
    didRedirect.current = true;
    router.replace(redirectHref);
  }, [loading, locked, redirectHref, router]);

  if (loading || (locked && redirectHref)) {
    return (
      <GeneratingIndicator
        label={t("checking")}
        hint={locked ? t("redirecting") : undefined}
        className="max-w-xl"
      />
    );
  }

  return <>{children}</>;
}
