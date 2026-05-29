"use client";

import { SetupProgress } from "@/components/onboarding/setup-progress";
import { useOnboardingProgress } from "@/contexts/onboarding-progress-context";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export function WelcomeScreen() {
  const t = useTranslations("setup.onboarding.welcome");
  const router = useRouter();
  const { progress, loading } = useOnboardingProgress();

  useEffect(() => {
    if (loading || !progress) return;
    if (progress.completion.isOnboardingComplete) {
      router.replace("/articles/new");
      return;
    }
    if (progress.canAccessCreation && !progress.completion.hasGeneratedPost) {
      router.replace("/start/ready");
    }
  }, [loading, progress, router]);

  const ctaHref =
    progress?.nextHref ??
    (progress?.completion.hasApiKey ? "/setup/author" : "/setup/llm");

  const pillars = t.raw("pillars") as string[];

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-ns-primary/20 bg-gradient-to-br from-ns-brand-light via-white to-white p-6 md:p-8">
        <p className="text-xs font-black uppercase tracking-widest text-ns-primary">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-ns-tertiary md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-ns-secondary md:text-base">
          {t("subtitle")}
        </p>
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

      {!loading && progress && progress.percent > 0 && progress.percent < 100 && (
        <p className="text-sm font-medium text-ns-secondary">
          {t("resumeHint", { percent: progress.percent })}
        </p>
      )}

      <SetupProgress placement="settings" />

      <div className="flex flex-wrap gap-3">
        <Link href={ctaHref} className={BTN_PRIMARY}>
          {progress?.percent && progress.percent > 0 && progress.percent < 100
            ? t("ctaResume")
            : t("ctaStart")}
        </Link>
        {progress?.canAccessCreation && (
          <Link
            href="/start/ready"
            className="rounded-lg border border-ns-alternate px-4 py-2.5 text-sm font-semibold text-ns-tertiary hover:bg-ns-brand-light"
          >
            {t("ctaReady")}
          </Link>
        )}
      </div>
    </div>
  );
}
