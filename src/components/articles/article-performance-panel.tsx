"use client";

import { saveArticlePerformanceSignals } from "@/lib/workspace/articles";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import type { ArticlePerformanceSignals } from "@/types/workspace";
import { ImeSafeInput, ImeSafeTextarea } from "@/components/ui/ime-safe-field";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  userId: string;
  articleId: string;
  signals: ArticlePerformanceSignals | undefined;
  onSaved: (signals: ArticlePerformanceSignals) => void;
};

function parseOptionalInt(raw: string): number | undefined {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function ArticlePerformancePanel({
  userId,
  articleId,
  signals,
  onSaved,
}: Props) {
  const t = useTranslations("setup.articles.performance");
  const [impressions, setImpressions] = useState(
    signals?.impressions != null ? String(signals.impressions) : "",
  );
  const [reactions, setReactions] = useState(
    signals?.reactions != null ? String(signals.reactions) : "",
  );
  const [comments, setComments] = useState(
    signals?.comments != null ? String(signals.comments) : "",
  );
  const [notes, setNotes] = useState(signals?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSave() {
    setSaving(true);
    setSaved(false);
    try {
      const payload: ArticlePerformanceSignals = {
        impressions: parseOptionalInt(impressions),
        reactions: parseOptionalInt(reactions),
        comments: parseOptionalInt(comments),
        notes: notes.trim() || undefined,
        recordedAt: new Date().toISOString().slice(0, 10),
      };
      await saveArticlePerformanceSignals(userId, articleId, payload);
      onSaved(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-gray-200/80 pt-4">
      <div>
        <h3 className="text-sm font-semibold text-ns-tertiary">{t("title")}</h3>
        <p className="mt-1 text-xs text-ns-secondary">{t("hint")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={LABEL_CLASS} htmlFor="perf-impressions">
            {t("impressions")}
          </label>
          <ImeSafeInput
            id="perf-impressions"
            type="number"
            min={0}
            value={impressions}
            onValueChange={setImpressions}
            placeholder="0"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="perf-reactions">
            {t("reactions")}
          </label>
          <ImeSafeInput
            id="perf-reactions"
            type="number"
            min={0}
            value={reactions}
            onValueChange={setReactions}
            placeholder="0"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="perf-comments">
            {t("comments")}
          </label>
          <ImeSafeInput
            id="perf-comments"
            type="number"
            min={0}
            value={comments}
            onValueChange={setComments}
            placeholder="0"
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="perf-notes">
          {t("notes")}
        </label>
        <ImeSafeTextarea
          id="perf-notes"
          rows={2}
          value={notes}
          onValueChange={setNotes}
          placeholder={t("notesPlaceholder")}
          className={`${INPUT_CLASS} min-h-[3rem] resize-y`}
        />
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => void onSave()}
        className="rounded-lg border border-ns-alternate bg-white px-4 py-2 text-sm font-medium text-ns-tertiary hover:bg-ns-brand-light disabled:opacity-50"
      >
        {saving ? t("saving") : saved ? t("saved") : t("save")}
      </button>
    </div>
  );
}
