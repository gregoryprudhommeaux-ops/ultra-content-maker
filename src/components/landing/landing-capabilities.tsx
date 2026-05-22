"use client";

import { useTranslations } from "next-intl";

const CARD_KEYS = [
  "persona",
  "brief",
  "exploration",
  "quality",
  "distribution",
] as const;

const ICONS: Record<(typeof CARD_KEYS)[number], string> = {
  persona: "01",
  brief: "02",
  exploration: "03",
  quality: "04",
  distribution: "05",
};

/** 2 wide cards on row 1, 3 equal on row 2 (lg 6-col grid). Last card full-width on sm when alone. */
const COL_SPAN: Record<(typeof CARD_KEYS)[number], string> = {
  persona: "lg:col-span-3",
  brief: "lg:col-span-3",
  exploration: "lg:col-span-2",
  quality: "lg:col-span-2",
  distribution: "sm:col-span-2 lg:col-span-2",
};

export function LandingCapabilities() {
  const t = useTranslations("landing.capabilities");

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:gap-4">
      {CARD_KEYS.map((key) => (
        <article
          key={key}
          className={`flex h-full flex-col rounded-2xl border border-gray-100 bg-ns-surface p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 ${COL_SPAN[key]}`}
        >
          <div className="flex items-start gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ns-primary/15 text-xs font-bold text-ns-tertiary"
              aria-hidden
            >
              {ICONS[key]}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold leading-snug text-ns-tertiary md:text-[17px]">
                {t(`${key}.title`)}
              </h3>
              <p className="mt-1.5 text-xs font-medium leading-relaxed text-ns-secondary md:text-sm">
                {t(`${key}.description`)}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
