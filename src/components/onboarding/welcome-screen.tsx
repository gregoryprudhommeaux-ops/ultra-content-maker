"use client";

import { SetupProgress } from "@/components/onboarding/setup-progress";
import { useOnboardingProgress } from "@/contexts/onboarding-progress-context";
import { isOnboardingBootstrapping } from "@/lib/workspace/onboarding-shell";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { resolveWelcomeRedirect } from "@/lib/workspace/onboarding-routes";
import type { OnboardingNextStep } from "@/lib/workspace/onboarding-status";
import { BTN_PRIMARY, PAGE_TITLE } from "@/lib/ui/nextstep";
import { Link, useRouter } from "@/i18n/navigation";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

const STEP_I18N_KEY: Record<OnboardingNextStep, string> = {
  "setup-llm": "setupLlm",
  "setup-express": "setupExpress",
  "author-essential": "authorEssential",
  audience: "audience",
  persona: "persona",
  "start-ready": "startReady",
  "articles-new": "articlesNew",
  "start-hub": "startHub",
};

export function WelcomeScreen() {
  const t = useTranslations("setup.onboarding.welcome");
  const tHub = useTranslations("setup.onboarding.hub");
  const tSteps = useTranslations("setup.steps");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { progress, status, loading } = useOnboardingProgress();
  const bootstrapping = isOnboardingBootstrapping(loading, progress);

  const redirectHref = resolveWelcomeRedirect(progress);

  useEffect(() => {
    if (bootstrapping || !redirectHref) return;
    router.replace(redirectHref);
  }, [bootstrapping, redirectHref, router]);

  if (bootstrapping || redirectHref) {
    return (
      <GeneratingIndicator label={tCommon("loading")} className="max-w-xl" />
    );
  }

  if (!progress || !status) {
    return null;
  }

  const ctaHref = status.nextHref;
  const nextStepKey = STEP_I18N_KEY[status.nextStep];
  const completedSteps = progress.steps.filter((s) => s.complete);

  const pillars = t.raw("pillars") as string[];

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-ns-primary/20 bg-gradient-to-br from-ns-brand-light via-white to-white p-6 md:p-8">
        <p className="text-xs font-black uppercase tracking-widest text-ns-primary">
          {t("eyebrow")}
        </p>
        <h1 className={`mt-2 ${PAGE_TITLE}`}>
          {t("title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-ns-secondary md:text-base">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-ns-primary/30 bg-ns-brand-light/40 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-ns-primary">
            {tHub("nextActionTitle")}
          </p>
          <h2 className="mt-2 text-lg font-bold text-ns-tertiary">
            {tHub(`steps.${nextStepKey}.title`)}
          </h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-ns-secondary">
            {tHub(`steps.${nextStepKey}.description`)}
          </p>
          <Link href={ctaHref} className={`${BTN_PRIMARY} mt-4 inline-flex`}>
            {progress.percent > 0 && progress.percent < 100
              ? t("ctaResume")
              : tHub("ctaContinue")}
          </Link>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-ns-secondary">
            {tHub("completedTitle")}
          </p>
          {completedSteps.length === 0 ? (
            <p className="mt-3 text-sm font-medium text-ns-secondary">
              {tHub("completedEmpty")}
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {completedSteps.map((step) => (
                <li
                  key={step.key}
                  className="flex items-center gap-2 text-sm font-medium text-ns-tertiary"
                >
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-ns-primary"
                    aria-hidden
                  />
                  {tSteps(step.key)}
                </li>
              ))}
            </ul>
          )}
          {progress.percent > 0 && progress.percent < 100 && (
            <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-ns-secondary">
              <CircleDashed className="h-3.5 w-3.5" aria-hidden />
              {t("resumeHint", { percent: progress.percent })}
            </p>
          )}
        </section>
      </div>

      <ul className="grid gap-3 md:grid-cols-3">
        {Array.isArray(pillars) &&
          pillars.map((text, i) => (
            <li
              key={i}
              className="rounded-xl border border-gray-100 bg-white p-4 text-sm font-medium leading-relaxed text-ns-tertiary shadow-sm"
            >
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ns-primary text-xs font-black text-black">
                {i + 1}
              </span>
              {text}
            </li>
          ))}
      </ul>

      <SetupProgress placement="settings" />
    </div>
  );
}
