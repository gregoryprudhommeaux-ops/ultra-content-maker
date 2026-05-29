"use client";

import { useOnboardingProgress } from "@/contexts/onboarding-progress-context";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export function ReadyScreen() {
  const t = useTranslations("setup.onboarding.ready");
  const router = useRouter();
  const { progress, loading } = useOnboardingProgress();

  useEffect(() => {
    if (loading || !progress) return;
    if (!progress.canAccessCreation) {
      router.replace(progress.nextHref ?? "/start");
      return;
    }
    if (progress.completion.isOnboardingComplete) {
      router.replace("/articles/new");
    }
  }, [loading, progress, router]);

  if (loading || !progress) {
    return <GeneratingIndicator label={t("loading")} className="max-w-xl" />;
  }

  if (!progress.canAccessCreation) {
    return null;
  }

  if (progress.completion.isOnboardingComplete) {
    return <GeneratingIndicator label={t("loading")} className="max-w-xl" />;
  }

  const checklist = [
    { done: progress.completion.hasApiKey, label: t("check.apiKey") },
    { done: progress.completion.hasProfileMinimum, label: t("check.profile") },
    { done: progress.completion.hasAudience, label: t("check.audience") },
    { done: progress.completion.hasPersonaValidated, label: t("check.persona") },
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-ns-primary/30 bg-ns-primary/10 p-6 md:p-8 text-center">
        <p className="text-4xl" aria-hidden>
          ✓
        </p>
        <h1 className="mt-3 text-2xl font-black uppercase tracking-tight text-ns-tertiary">
          {t("title")}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm font-medium leading-relaxed text-ns-secondary">
          {t("subtitle")}
        </p>
      </div>

      <ul className="mx-auto max-w-md space-y-2">
        {checklist.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-2.5 text-sm"
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                item.done ? "bg-ns-primary text-black" : "bg-gray-100 text-ns-secondary"
              }`}
              aria-hidden
            >
              {item.done ? "✓" : "·"}
            </span>
            <span className={item.done ? "text-ns-tertiary font-medium" : "text-ns-secondary"}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link href="/articles/new" className={BTN_PRIMARY}>
          {t("ctaCreate")}
        </Link>
        <Link
          href="/persona"
          className="text-sm font-semibold text-ns-tertiary underline hover:text-ns-primary"
        >
          {t("ctaReviewPersona")}
        </Link>
      </div>
    </div>
  );
}
