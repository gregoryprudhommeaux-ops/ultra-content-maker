"use client";

import { detectSlop } from "@/lib/articles/slop-detector";
import { ContextHelp } from "@/components/ui/context-help";
import type { ArticleDoc, SlopAnalysis } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

type Props = {
  article: ArticleDoc;
  disabled?: boolean;
  onSave?: (slop: SlopAnalysis) => void;
};

function scoreTone(slopScore: number): "good" | "warn" | "bad" {
  if (slopScore >= 6) return "bad";
  if (slopScore >= 4) return "warn";
  return "good";
}

export function ArticleSlopPanel({ article, disabled, onSave }: Props) {
  const t = useTranslations("setup.articles.slop");
  const live = useMemo(
    () => detectSlop(`${article.hook}\n\n${article.body}`),
    [article.hook, article.body],
  );
  const [stored, setStored] = useState<SlopAnalysis | null>(article.slopAnalysis ?? null);
  const [savedFlash, setSavedFlash] = useState(false);
  const display = stored ?? live;
  const tone = scoreTone(display.slopScore);

  useEffect(() => {
    setStored(article.slopAnalysis ?? null);
  }, [article.slopAnalysis, article.id]);

  async function persist() {
    setStored(live);
    try {
      await onSave?.(live);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2500);
    } catch {
      /* parent may surface error */
    }
  }

  const guidanceKey =
    display.summary === "heavy_slop"
      ? "guidanceHeavy"
      : display.summary === "mild_slop"
        ? "guidanceMild"
        : "guidanceClean";

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-4 md:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-ns-tertiary">{t("title")}</h2>
            <ContextHelp label={t("help.label")}>{t("help.body")}</ContextHelp>
          </div>
          <p className="text-sm leading-relaxed text-ns-secondary">{t("intro")}</p>
        </div>
        {onSave && (
          <span className="flex shrink-0 items-center gap-2">
            {savedFlash && (
              <span className="text-xs font-medium text-ns-primary">{t("saved")}</span>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => void persist()}
              className="text-sm font-medium text-ns-tertiary underline hover:text-ns-primary disabled:opacity-50"
            >
              {t("save")}
            </button>
          </span>
        )}
      </div>

      <div className="rounded-lg border border-gray-100 bg-ns-brand-light/50 px-3 py-2.5 text-xs leading-relaxed text-ns-secondary">
        <p className="font-semibold text-ns-tertiary">{t("howItWorksTitle")}</p>
        <p className="mt-1">{t("howItWorks")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-100 bg-ns-brand-light/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ns-secondary">
            {t("humanScoreLabel")}
          </p>
          <p
            className={`mt-1 text-2xl font-bold ${
              tone === "good" ? "text-ns-tertiary" : tone === "warn" ? "text-amber-800" : "text-red-700"
            }`}
          >
            {display.humanScore}/10
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ns-secondary">{t("humanScoreHelp")}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-ns-brand-light/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ns-secondary">
            {t("slopScoreLabel")}
          </p>
          <p
            className={`mt-1 text-2xl font-bold ${
              tone === "good" ? "text-ns-tertiary" : tone === "warn" ? "text-amber-800" : "text-red-700"
            }`}
          >
            {display.slopScore}/10
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ns-secondary">{t("slopScoreHelp")}</p>
        </div>
      </div>

      <p className="text-sm font-medium text-ns-tertiary">{t(`summary.${display.summary}`)}</p>
      <p className="text-sm leading-relaxed text-ns-secondary">{t(guidanceKey)}</p>

      {display.flags.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ns-secondary">
            {t("flagsTitle")}
          </p>
          <ul className="flex flex-wrap gap-2">
            {display.flags.map((flag) => (
              <li
                key={flag}
                className="rounded-md border border-amber-200/80 bg-amber-50 px-2 py-1 text-xs text-amber-900"
                title={t(`flagsHelp.${flag}`, { defaultValue: "" })}
              >
                {t(`flags.${flag}`, { defaultValue: flag })}
              </li>
            ))}
          </ul>
          <p className="text-xs text-ns-secondary">{t("flagsHint")}</p>
        </div>
      )}

      {display.slopScore >= 6 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          {t("warning")}
        </p>
      )}
    </section>
  );
}
