"use client";

import { REVISE_INTENTS, type ReviseIntent } from "@/lib/prompts/revise-intent-prompts";
import {
  ButtonSpinner,
  GeneratingIndicator,
} from "@/components/ui/generating-indicator";
import type { ArticleQualityScores, ArticleDoc } from "@/types/workspace";
import { useTranslations } from "next-intl";

type Props = {
  article: ArticleDoc;
  scores: ArticleQualityScores | null;
  alternativeHooks: string[];
  critique: string | null;
  loading: boolean;
  onAnalyze: () => void;
  onApplyHook: (hook: string) => void;
  onReviseIntent: (intent: ReviseIntent) => void;
  revising: boolean;
};

const SCORE_KEYS: (keyof ArticleQualityScores)[] = [
  "nicheClarity",
  "humanPov",
  "proofDensity",
  "conversationPotential",
];

export function ArticleQualityPanel({
  article,
  scores,
  alternativeHooks,
  critique,
  loading,
  onAnalyze,
  onApplyHook,
  onReviseIntent,
  revising,
}: Props) {
  const t = useTranslations("setup.articles.quality");

  return (
    <section className="rounded-xl border border-gray-100 bg-ns-brand-light/30 p-4 md:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ns-tertiary">{t("title")}</h2>
          <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          disabled={loading || revising}
          onClick={onAnalyze}
          className="shrink-0 text-sm font-medium text-ns-tertiary underline hover:text-ns-primary disabled:opacity-50"
        >
          {loading ? "…" : scores ? t("refresh") : t("analyze")}
        </button>
      </div>

      {scores && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {SCORE_KEYS.map((key) => (
            <li key={key} className="rounded-lg border border-gray-100 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-ns-secondary">
                  {t(`scores.${key}`)}
                </span>
                <span className="text-sm font-bold text-ns-tertiary">
                  {scores[key]}/10
                </span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100"
                role="progressbar"
                aria-valuenow={scores[key]}
                aria-valuemin={0}
                aria-valuemax={10}
              >
                <div
                  className="h-full rounded-full bg-ns-primary transition-all"
                  style={{ width: `${scores[key] * 10}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {critique && (
        <p className="text-sm text-ns-secondary leading-relaxed">{critique}</p>
      )}

      {alternativeHooks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ns-secondary">
            {t("alternativeHooks")}
          </p>
          <ul className="space-y-2">
            {alternativeHooks.map((hook, i) => (
              <li
                key={i}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-gray-100 bg-white p-3"
              >
                <p className="text-sm text-ns-tertiary flex-1">{hook}</p>
                <button
                  type="button"
                  disabled={revising || hook === article.hook}
                  onClick={() => onApplyHook(hook)}
                  className="text-xs font-medium text-ns-primary underline disabled:opacity-50"
                >
                  {t("useHook")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3 border-t border-gray-100 pt-3">
        <div className="flex flex-wrap gap-2">
          {REVISE_INTENTS.map(
            (intent) => (
              <button
                key={intent}
                type="button"
                disabled={revising || loading}
                onClick={() => onReviseIntent(intent)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs font-medium text-ns-tertiary hover:border-ns-primary/40 disabled:opacity-50"
              >
                {revising && <ButtonSpinner className="h-3 w-3 border-ns-alternate border-t-zinc-700" />}
                {t(`actions.${intent}`)}
              </button>
            ),
          )}
        </div>
        {revising && (
          <GeneratingIndicator
            label={t("revising")}
            hint={t("revisingHint")}
            className="max-w-xl"
          />
        )}
      </div>
    </section>
  );
}
