"use client";

import { useTranslations } from "next-intl";

const CARD_KEYS = [
  "persona",
  "sources",
  "radar",
  "exploration",
  "quality",
  "distribution",
] as const;

const ICONS: Record<(typeof CARD_KEYS)[number], string> = {
  persona: "01",
  sources: "02",
  radar: "03",
  exploration: "04",
  quality: "05",
  distribution: "06",
};

export function LandingCapabilities() {
  const t = useTranslations("landing.capabilities");

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
      {CARD_KEYS.map((key) => (
        <li key={key} className="min-h-0">
          <article className="flex h-full flex-col rounded-2xl border border-gray-100 bg-ns-surface p-5 shadow-sm transition-shadow hover:shadow-md">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ns-primary/15 text-xs font-bold text-ns-tertiary"
              aria-hidden
            >
              {ICONS[key]}
            </span>
            <h3 className="mt-4 text-base font-bold leading-snug text-ns-tertiary">
              {t(`${key}.title`)}
            </h3>
            <p className="mt-2 flex-1 text-sm font-medium leading-relaxed text-ns-secondary">
              {t(`${key}.description`)}
            </p>
          </article>
        </li>
      ))}
    </ul>
  );
}
