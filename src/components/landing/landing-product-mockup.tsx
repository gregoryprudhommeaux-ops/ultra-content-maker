"use client";

import { useTranslations } from "next-intl";

const WOW_KEYS = ["persona", "batch", "quality"] as const;
const FLOW_KEYS = ["sources", "brief", "drafts", "export"] as const;

export function LandingProductMockup() {
  const t = useTranslations("landing.product");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5" role="group" aria-label={t("mockupAria")}>
      {/* Hero WOW: 4 drafts */}
      <article className="relative overflow-hidden rounded-2xl bg-ns-hero p-6 text-white shadow-lg md:p-8">
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-ns-primary/20 blur-3xl"
          aria-hidden
        />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ns-primary">
              {t("wowHero.eyebrow")}
            </p>
            <h3 className="mt-2 text-balance text-2xl font-bold tracking-tight text-white md:text-3xl">
              {t("wowHero.title")}
            </h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/90 md:text-base">
              {t("wowHero.body")}
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {(["stat1", "stat2", "stat3"] as const).map((key) => (
                <li
                  key={key}
                  className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold text-white"
                >
                  {t(`wowHero.${key}`)}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {(["post1", "post2", "post3", "post4"] as const).map((key, i) => {
              const isNiche = i >= 2;
              return (
                <div
                  key={key}
                  className={`rounded-xl border bg-white p-3 shadow-md ${
                    isNiche ? "border-ns-secondary/40" : "border-ns-primary/50"
                  }`}
                >
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                      isNiche
                        ? "bg-ns-secondary text-white"
                        : "bg-ns-primary text-ns-hero"
                    }`}
                  >
                    {t(`scope.${isNiche ? "niche" : "generalist"}`)}
                  </span>
                  <p className="mt-2 text-[11px] font-semibold leading-snug text-ns-tertiary line-clamp-2">
                    {t(`posts.${key}`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </article>

      {/* WOW moments 2–4 (hero above is #1: 4-draft batch) */}
      <ul className="grid gap-4 md:grid-cols-3">
        {WOW_KEYS.map((key) => (
          <li key={key}>
            <article className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ns-primary/15 text-[11px] font-black tracking-wide text-ns-tertiary">
                {t(`wow.${key}.abbr`)}
              </span>
              <h4 className="mt-3 text-base font-bold text-ns-tertiary">{t(`wow.${key}.title`)}</h4>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ns-secondary">
                {t(`wow.${key}.body`)}
              </p>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-ns-primary">
                {t(`wow.${key}.tag`)}
              </p>
            </article>
          </li>
        ))}
      </ul>

      {/* Pipeline: uniform strip */}
      <div className="rounded-2xl border border-ns-alternate/60 bg-ns-brand-light/40 px-4 py-5 md:px-6">
        <p className="text-center text-xs font-bold uppercase tracking-[0.18em] text-ns-secondary">
          {t("flow.label")}
        </p>
        <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FLOW_KEYS.map((key, index) => (
            <li key={key} className="relative text-center">
              <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-ns-tertiary text-xs font-black text-white">
                {index + 1}
              </span>
              <p className="mt-2 text-sm font-bold text-ns-tertiary">{t(`flow.steps.${key}.title`)}</p>
              <p className="mt-1 text-xs leading-snug text-ns-secondary">
                {t(`flow.steps.${key}.hint`)}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <p className="sr-only">{t("mockupSummary")}</p>
    </div>
  );
}
