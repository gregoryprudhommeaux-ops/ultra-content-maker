"use client";

import { useOnboardingProgress } from "@/contexts/onboarding-progress-context";
import { isOnboardingBootstrapping } from "@/lib/workspace/onboarding-shell";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Props = {
  stepKey: "llm" | "author" | "audience" | "persona";
};

/** Compact banner on setup steps during guided onboarding. */
export function OnboardingStepBanner({ stepKey }: Props) {
  const t = useTranslations("setup.onboarding.wizard");
  const { progress, loading } = useOnboardingProgress();

  if (
    isOnboardingBootstrapping(loading, progress) ||
    !progress ||
    progress.completion.isOnboardingComplete
  ) {
    return null;
  }

  const index = progress.steps.findIndex((s) => s.key === stepKey);
  if (index < 0) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ns-primary/20 bg-ns-primary/5 px-4 py-2.5">
      <p className="text-xs font-semibold text-ns-tertiary">
        {t("stepLabel", {
          current: index + 1,
          total: progress.steps.length,
        })}
      </p>
      <Link href="/start" className="text-xs font-medium text-ns-primary hover:underline">
        {t("backToWelcome")}
      </Link>
    </div>
  );
}
