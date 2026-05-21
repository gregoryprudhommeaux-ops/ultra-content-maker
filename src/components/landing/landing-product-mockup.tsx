"use client";

import { useTranslations } from "next-intl";

const POST_KEYS = ["post1", "post2", "post3", "post4"] as const;
const SCOPES = ["generalist", "generalist", "niche", "niche"] as const;

export function LandingProductMockup() {
  const t = useTranslations("landing.product");

  return (
    <div
      className="relative mx-auto w-full max-w-4xl rounded-2xl border border-white/10 bg-ns-surface p-4 shadow-2xl shadow-black/40 md:p-6"
      aria-hidden
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-ns-primary/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ns-tertiary">
            {t("personaBadge")}
          </span>
          <span className="text-xs font-medium text-ns-secondary">{t("batchLabel")}</span>
        </div>
        <span className="rounded-lg bg-ns-primary px-3 py-1.5 text-xs font-semibold text-black">
          {t("generateAction")}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {POST_KEYS.map((key, i) => {
          const scope = SCOPES[i];
          const border =
            scope === "generalist" ? "border-l-ns-primary" : "border-l-ns-secondary";
          return (
            <div
              key={key}
              className={`rounded-xl border border-gray-100 border-l-[4px] bg-ns-brand-light p-4 ${border}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-ns-secondary">
                  {t(`scope.${scope}`)}
                </span>
                <span className="text-[10px] font-medium text-ns-secondary/70">
                  {t(`status.${i === 3 ? "validated" : "draft"}`)}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium leading-snug text-ns-tertiary">
                {t(`posts.${key}`)}
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[11px] font-medium text-ns-secondary/80">
        {t("caption")}
      </p>
    </div>
  );
}
