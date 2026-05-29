"use client";

import type { PersonaRecentChange } from "@/types/workspace";
import { useLocale, useTranslations } from "next-intl";

type Props = {
  changes: PersonaRecentChange[];
};

export function PersonaRecentUpdatesPanel({ changes }: Props) {
  const t = useTranslations("setup.persona.recentUpdates");
  const locale = useLocale();

  if (changes.length === 0) return null;

  return (
    <section className="rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-5 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-ns-tertiary">{t("title")}</h2>
        <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
      </div>
      <ul className="space-y-2">
        {changes.slice(0, 2).map((change, index) => (
          <li
            key={`${change.at.toISOString()}-${index}`}
            className="rounded-lg border border-emerald-100 bg-white px-3 py-2 text-sm"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-ns-secondary">
              <time dateTime={change.at.toISOString()}>
                {new Intl.DateTimeFormat(locale, {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }).format(change.at)}
              </time>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5">
                {t(`source.${change.source}`)}
              </span>
            </div>
            <p className="mt-1 text-ns-tertiary leading-relaxed whitespace-pre-wrap">
              {change.summary.split(" · ").join("\n")}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
