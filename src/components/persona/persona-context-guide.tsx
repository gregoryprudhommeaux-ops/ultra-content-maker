"use client";

import { useTranslations } from "next-intl";

export function PersonaContextGuide() {
  const t = useTranslations("setup.persona.help");

  const sections = [
    "contentBrain",
    "topicDna",
    "operatingRules",
    "learned",
    "validate",
    "measurement",
  ] as const;

  return (
    <details className="rounded-xl border border-sky-200/80 bg-sky-50/50">
      <summary className="cursor-pointer list-none px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2 text-sm font-semibold text-ns-tertiary">
          {t("guideTitle")}
          <span className="text-xs font-medium text-ns-secondary" aria-hidden>
            ▾
          </span>
        </span>
        <p className="mt-1 text-xs font-medium text-ns-secondary">{t("guideHint")}</p>
      </summary>
      <div className="space-y-4 border-t border-sky-100/80 px-4 py-4">
        {sections.map((key) => (
          <article key={key}>
            <h3 className="text-sm font-semibold text-ns-tertiary">
              {t(`sections.${key}.title`)}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-ns-secondary">
              {t(`sections.${key}.body`)}
            </p>
          </article>
        ))}
      </div>
    </details>
  );
}
