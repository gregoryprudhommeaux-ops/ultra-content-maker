"use client";

import { useOnboardingProgress } from "@/contexts/onboarding-progress-context";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { OnboardingBlockedBanner } from "@/components/onboarding/onboarding-blocked-banner";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, type ReactNode } from "react";

export type OnboardingGuardMode = "creation" | "persona" | "none";

type Props = {
  mode?: OnboardingGuardMode;
  children: ReactNode;
  /** When true, redirect instead of showing banner (creation flow). */
  redirect?: boolean;
};

/**
 * Blocks or redirects when setup is incomplete.
 * - creation: requires API key, profile, audience, validated persona
 * - persona: requires validated persona only (legacy articles hub)
 */
export function OnboardingGuard({
  mode = "none",
  children,
  redirect = false,
}: Props) {
  const t = useTranslations("setup.onboarding.guard");
  const router = useRouter();
  const { progress, status, loading } = useOnboardingProgress();
  const didRedirect = useRef(false);

  const blocked =
    progress &&
    (mode === "creation"
      ? !progress.canAccessCreation
      : mode === "persona"
        ? !progress.completion.hasPersonaValidated
        : false);

  const redirectHref =
    mode === "creation"
      ? (status?.nextHref ?? progress?.creationRedirectHref ?? "/start")
      : (status?.nextHref ?? progress?.nextHref);

  useEffect(() => {
    if (!redirect || !blocked || !redirectHref || didRedirect.current) return;
    didRedirect.current = true;
    router.replace(redirectHref);
  }, [redirect, blocked, redirectHref, router]);

  if (loading || (redirect && blocked)) {
    return (
      <GeneratingIndicator
        label={t("checking")}
        hint={blocked ? t("redirecting") : undefined}
        className="max-w-xl"
      />
    );
  }

  if (blocked && !redirect) {
    const reason =
      mode === "persona"
        ? "persona"
        : progress?.completion.hasApiKey
          ? progress.completion.hasProfileMinimum
            ? progress.completion.hasAudience
              ? "persona"
              : "audience"
            : "author"
          : "llm";
    return <OnboardingBlockedBanner reason={reason} />;
  }

  return <>{children}</>;
}
