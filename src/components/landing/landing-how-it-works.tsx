"use client";

import { useTranslations } from "next-intl";

const STEP_KEYS = ["setup", "persona", "create", "publish"] as const;

export function LandingHowItWorks() {
  const t = useTranslations("landing.howItWorks");

  return (
    <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
      {STEP_KEYS.map((key, index) => (
        <li key={key} className="relative flex flex-col lg:items-center">
          {index < STEP_KEYS.length - 1 && (
            <span
              className="absolute left-5 top-10 hidden h-px w-[calc(100%+1rem)] bg-ns-alternate lg:left-[calc(50%+1.25rem)] lg:top-5 lg:block lg:h-0 lg:w-[calc(100%-2.5rem)] lg:border-t lg:border-dashed lg:border-ns-alternate"
              aria-hidden
            />
          )}
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ns-tertiary text-sm font-black text-white">
            {index + 1}
          </span>
          <h3 className="mt-4 text-sm font-bold text-ns-tertiary lg:mt-3 lg:text-center">
            {t(`steps.${key}.title`)}
          </h3>
          <p className="mt-2 text-sm font-medium leading-relaxed text-ns-secondary lg:text-center">
            {t(`steps.${key}.description`)}
          </p>
        </li>
      ))}
    </ol>
  );
}
