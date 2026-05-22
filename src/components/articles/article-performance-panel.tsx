"use client";

import type { ArticleDoc, ArticlePerformanceSignals } from "@/types/workspace";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Props = {
  article: ArticleDoc;
  disabled?: boolean;
  onSave: (signals: ArticlePerformanceSignals) => void;
};

function emptySignals(): ArticlePerformanceSignals {
  return {
    saves: undefined,
    qualifiedComments: undefined,
    profileVisits: undefined,
    dms: undefined,
    businessOpportunity: "",
    notes: "",
    recordedAt: new Date().toISOString().slice(0, 10),
  };
}

export function ArticlePerformancePanel({ article, disabled, onSave }: Props) {
  const t = useTranslations("setup.articles.performance");
  const [signals, setSignals] = useState<ArticlePerformanceSignals>(
    article.performanceSignals ?? emptySignals(),
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSignals(article.performanceSignals ?? emptySignals());
    setSaved(false);
  }, [article.id, article.performanceSignals]);

  function setNum(key: keyof ArticlePerformanceSignals, raw: string) {
    const n = raw === "" ? undefined : Math.max(0, parseInt(raw, 10) || 0);
    setSignals((s) => ({ ...s, [key]: n }));
    setSaved(false);
  }

  function handleSave() {
    const payload: ArticlePerformanceSignals = {
      ...signals,
      recordedAt: new Date().toISOString().slice(0, 10),
    };
    onSave(payload);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const hasAnyMetric =
    signals.saves != null ||
    signals.qualifiedComments != null ||
    signals.profileVisits != null ||
    signals.dms != null ||
    !!signals.businessOpportunity?.trim();

  return (
    <section className="rounded-xl border border-emerald-200/60 bg-emerald-50/30 p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-ns-tertiary">{t("title")}</h2>
        <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            "saves",
            "qualifiedComments",
            "profileVisits",
            "dms",
          ] as const
        ).map((key) => (
          <div key={key}>
            <label className={LABEL_CLASS} htmlFor={`perf-${key}`}>
              {t(`fields.${key}`)}
            </label>
            <input
              id={`perf-${key}`}
              type="number"
              min={0}
              inputMode="numeric"
              value={signals[key] ?? ""}
              onChange={(e) => setNum(key, e.target.value)}
              className={`${INPUT_CLASS} mt-1`}
              placeholder="0"
            />
          </div>
        ))}
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="perf-opportunity">
          {t("fields.businessOpportunity")}
        </label>
        <input
          id="perf-opportunity"
          type="text"
          value={signals.businessOpportunity ?? ""}
          onChange={(e) => {
            setSignals((s) => ({ ...s, businessOpportunity: e.target.value }));
            setSaved(false);
          }}
          placeholder={t("opportunityPlaceholder")}
          className={`${INPUT_CLASS} mt-1`}
        />
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="perf-notes">
          {t("fields.notes")}
        </label>
        <textarea
          id="perf-notes"
          rows={2}
          value={signals.notes ?? ""}
          onChange={(e) => {
            setSignals((s) => ({ ...s, notes: e.target.value }));
            setSaved(false);
          }}
          className={`${INPUT_CLASS} mt-1`}
          placeholder={t("notesPlaceholder")}
        />
      </div>

      <button
        type="button"
        disabled={disabled || !hasAnyMetric}
        onClick={handleSave}
        className="rounded-sm bg-ns-tertiary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-ns-tertiary/90 disabled:opacity-50"
      >
        {saved ? t("saved") : t("save")}
      </button>
      {!hasAnyMetric && (
        <p className="text-xs text-ns-secondary">{t("needOneMetric")}</p>
      )}
    </section>
  );
}
