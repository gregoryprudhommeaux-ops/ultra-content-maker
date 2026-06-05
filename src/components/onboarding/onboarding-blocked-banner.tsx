"use client";

import { useOnboardingProgress } from "@/contexts/onboarding-progress-context";
import { isOnboardingBootstrapping } from "@/lib/workspace/onboarding-shell";
import {
  ONBOARDING_STEPS,
  type OnboardingStepKey,
} from "@/lib/workspace/onboarding-progress";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type BannerReason = "persona" | "llm" | "author" | "audience" | "generic";

const REASON_TO_STEP: Partial<Record<BannerReason, OnboardingStepKey>> = {
  persona: "persona",
  llm: "llm",
  author: "author",
  audience: "audience",
};

type Props = {
  /** Fixed reason, or omit to infer from onboarding progress */
  reason?: BannerReason;
};

function resolveReason(
  explicit: BannerReason | undefined,
  nextStep: OnboardingStepKey | null,
): BannerReason {
  if (explicit) return explicit;
  if (nextStep === "llm") return "llm";
  if (nextStep === "author") return "author";
  if (nextStep === "audience") return "audience";
  if (nextStep === "persona") return "persona";
  return "generic";
}

function hrefForReason(
  reason: BannerReason,
  progressHref: string | null,
): string | null {
  if (progressHref) return progressHref;
  const key = REASON_TO_STEP[reason];
  if (!key) return null;
  return ONBOARDING_STEPS.find((s) => s.key === key)?.href ?? null;
}

export function OnboardingBlockedBanner({ reason: reasonProp }: Props) {
  const t = useTranslations("setup.onboarding.banner");
  const tSteps = useTranslations("setup.steps");
  const { progress, loading } = useOnboardingProgress();

  if (isOnboardingBootstrapping(loading, progress)) return null;

  const reason = resolveReason(reasonProp, progress?.nextStep ?? null);
  const href = hrefForReason(reason, progress?.nextHref ?? null);
  if (!href) return null;

  const stepKey = progress?.nextStep ?? REASON_TO_STEP[reason];
  const ctaLabel = stepKey ? tSteps(stepKey) : t("ctaDefault");

  return (
    <div
      className="rounded-2xl border border-ns-primary/30 bg-ns-primary/10 p-5 md:p-6"
      role="status"
    >
      <h2 className="text-base font-bold text-ns-tertiary">{t(`${reason}.title`)}</h2>
      <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-ns-secondary">
        {t(`${reason}.description`)}
      </p>
      {progress && (
        <p className="mt-2 text-xs font-medium text-ns-secondary">
          {t("progressHint", { percent: progress.percent })}
        </p>
      )}
      <Link href={href} className={`mt-4 ${BTN_PRIMARY}`}>
        {t("cta", { step: ctaLabel })}
      </Link>
    </div>
  );
}
