"use client";

import { detectSlop } from "@/lib/articles/slop-detector";
import type { ArticleDoc, SlopAnalysis } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

type Props = {
  article: ArticleDoc;
  disabled?: boolean;
  onSave?: (slop: SlopAnalysis) => void;
};

export function ArticleSlopPanel({ article, disabled, onSave }: Props) {
  const t = useTranslations("setup.articles.slop");
  const live = useMemo(
    () => detectSlop(`${article.hook}\n\n${article.body}`),
    [article.hook, article.body],
  );
  const [stored, setStored] = useState<SlopAnalysis | null>(article.slopAnalysis ?? null);
  const display = stored ?? live;

  useEffect(() => {
    setStored(article.slopAnalysis ?? null);
  }, [article.slopAnalysis, article.id]);

  function persist() {
    setStored(live);
    onSave?.(live);
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-4 md:p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ns-tertiary">{t("title")}</h2>
          <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
        </div>
        {onSave && (
          <button
            type="button"
            disabled={disabled}
            onClick={persist}
            className="text-sm font-medium text-ns-tertiary underline hover:text-ns-primary disabled:opacity-50"
          >
            {t("save")}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <p>
          <span className="text-ns-secondary">{t("humanScore")}: </span>
          <span className="font-bold text-ns-tertiary">{display.humanScore}/10</span>
        </p>
        <p>
          <span className="text-ns-secondary">{t("slopScore")}: </span>
          <span
            className={`font-bold ${display.slopScore >= 6 ? "text-amber-800" : "text-ns-tertiary"}`}
          >
            {display.slopScore}/10
          </span>
        </p>
      </div>

      <p className="text-sm text-ns-secondary">
        {t(`summary.${display.summary}`)}
      </p>

      {display.flags.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {display.flags.map((flag) => (
            <li
              key={flag}
              className="rounded-md border border-amber-200/80 bg-amber-50 px-2 py-1 text-xs text-amber-900"
            >
              {t(`flags.${flag}`, { defaultValue: flag })}
            </li>
          ))}
        </ul>
      )}

      {display.slopScore >= 6 && (
        <p className="text-xs font-medium text-amber-800">{t("warning")}</p>
      )}
    </section>
  );
}
