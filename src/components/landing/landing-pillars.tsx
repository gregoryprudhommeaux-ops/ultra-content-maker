"use client";

import { useTranslations } from "next-intl";

const PILLAR_KEYS = ["persona", "batch", "languages"] as const;

const ICONS: Record<(typeof PILLAR_KEYS)[number], string> = {
  persona: "01",
  batch: "02",
  languages: "03",
};

export function LandingPillars() {
  const t = useTranslations("landing.pillars");

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {PILLAR_KEYS.map((key) => (
        <article
          key={key}
          className="rounded-2xl border border-gray-100 bg-ns-surface p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-ns-primary/15 text-sm font-bold text-ns-tertiary"
            aria-hidden
          >
            {ICONS[key]}
          </span>
          <h3 className="mt-4 text-lg font-bold text-ns-tertiary">{t(`${key}.title`)}</h3>
          <p className="mt-2 text-sm font-medium leading-relaxed text-ns-secondary">
            {t(`${key}.description`)}
          </p>
        </article>
      ))}
    </div>
  );
}
