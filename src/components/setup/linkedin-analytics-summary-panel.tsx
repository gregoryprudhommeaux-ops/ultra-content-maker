"use client";

import { parseLinkedInAnalyticsCsv } from "@/lib/analytics/linkedin-analytics-csv";
import { OptionalLabel } from "@/components/setup/optional-label";
import { MAX_ANALYTICS_MONTHS } from "@/lib/persona/organization-enrichment";
import { FORM_SUBSECTION_TITLE } from "@/lib/ui/nextstep";
import { INPUT_CLASS } from "@/types/workspace";
import type { LinkedInAnalyticsMonthlySummary } from "@/types/workspace";
import { ImeSafeInput, ImeSafeTextarea } from "@/components/ui/ime-safe-field";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  months: LinkedInAnalyticsMonthlySummary[];
  onChange: (months: LinkedInAnalyticsMonthlySummary[]) => void;
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function emptyMonth(): LinkedInAnalyticsMonthlySummary {
  return {
    month: currentMonth(),
    totalImpressions: undefined,
    totalReactions: undefined,
    totalComments: undefined,
    notes: "",
  };
}

export function LinkedInAnalyticsSummaryPanel({ months, onChange }: Props) {
  const t = useTranslations("setup.author.linkedInAnalytics");
  const [csvText, setCsvText] = useState("");
  const [csvError, setCsvError] = useState<string | null>(null);

  const safe =
    months.length > 0 ? months.slice(0, MAX_ANALYTICS_MONTHS) : [emptyMonth()];

  function update(index: number, patch: Partial<LinkedInAnalyticsMonthlySummary>) {
    const next = [...safe];
    next[index] = { ...next[index]!, ...patch };
    onChange(next);
  }

  function addMonth() {
    if (safe.length >= MAX_ANALYTICS_MONTHS) return;
    onChange([...safe, emptyMonth()]);
  }

  function removeMonth(index: number) {
    const next = safe.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [emptyMonth()]);
  }

  function parseOptionalInt(raw: string): number | undefined {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  }

  function applyCsv() {
    setCsvError(null);
    const parsed = parseLinkedInAnalyticsCsv(csvText);
    if (parsed.length === 0) {
      setCsvError(t("csvInvalid"));
      return;
    }
    onChange(parsed.slice(0, MAX_ANALYTICS_MONTHS));
    setCsvText("");
  }

  return (
    <div className="space-y-4 rounded-xl border border-emerald-200/70 bg-emerald-50/30 p-4">
      <div>
        <h3 className={FORM_SUBSECTION_TITLE}>{t("title")}</h3>
        <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
      </div>

      <div className="rounded-lg border border-dashed border-emerald-200 bg-white/70 p-3 space-y-2">
        <p className="text-xs font-medium text-ns-tertiary">{t("csvImport")}</p>
        <textarea
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
          rows={3}
          placeholder={t("csvPlaceholder")}
          className={`${INPUT_CLASS} min-h-[4rem] resize-y font-mono text-xs`}
        />
        {csvError ? <p className="text-xs text-red-700">{csvError}</p> : null}
        <button
          type="button"
          disabled={!csvText.trim()}
          onClick={applyCsv}
          className="text-xs font-medium text-emerald-900 underline disabled:opacity-50"
        >
          {t("csvApply")}
        </button>
      </div>

      {safe.map((row, index) => (
        <div
          key={`${row.month}-${index}`}
          className="space-y-2 rounded-lg border border-emerald-100 bg-white/90 p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-900/80">
              {t("monthLabel", { index: index + 1 })}
            </p>
            {safe.length > 1 ? (
              <button
                type="button"
                onClick={() => removeMonth(index)}
                className="text-xs font-medium text-red-700 underline"
              >
                {t("remove")}
              </button>
            ) : null}
          </div>

          <div>
            <OptionalLabel htmlFor={`analytics-month-${index}`}>{t("month")}</OptionalLabel>
            <input
              id={`analytics-month-${index}`}
              type="month"
              value={row.month}
              onChange={(e) => update(index, { month: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <OptionalLabel htmlFor={`analytics-impr-${index}`} optional>
                {t("impressions")}
              </OptionalLabel>
              <ImeSafeInput
                id={`analytics-impr-${index}`}
                type="number"
                min={0}
                value={row.totalImpressions != null ? String(row.totalImpressions) : ""}
                onValueChange={(v) =>
                  update(index, { totalImpressions: parseOptionalInt(v) })
                }
                placeholder="0"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <OptionalLabel htmlFor={`analytics-react-${index}`} optional>
                {t("reactions")}
              </OptionalLabel>
              <ImeSafeInput
                id={`analytics-react-${index}`}
                type="number"
                min={0}
                value={row.totalReactions != null ? String(row.totalReactions) : ""}
                onValueChange={(v) =>
                  update(index, { totalReactions: parseOptionalInt(v) })
                }
                placeholder="0"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <OptionalLabel htmlFor={`analytics-comments-${index}`} optional>
                {t("comments")}
              </OptionalLabel>
              <ImeSafeInput
                id={`analytics-comments-${index}`}
                type="number"
                min={0}
                value={row.totalComments != null ? String(row.totalComments) : ""}
                onValueChange={(v) =>
                  update(index, { totalComments: parseOptionalInt(v) })
                }
                placeholder="0"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div>
            <OptionalLabel htmlFor={`analytics-notes-${index}`} optional>
              {t("notes")}
            </OptionalLabel>
            <ImeSafeTextarea
              id={`analytics-notes-${index}`}
              rows={2}
              value={row.notes ?? ""}
              onValueChange={(notes) => update(index, { notes })}
              placeholder={t("notesPlaceholder")}
              className={`${INPUT_CLASS} min-h-[3rem] resize-y`}
            />
          </div>
        </div>
      ))}

      {safe.length < MAX_ANALYTICS_MONTHS ? (
        <button
          type="button"
          onClick={addMonth}
          className="text-sm font-medium text-ns-primary underline"
        >
          {t("add", { current: safe.length, max: MAX_ANALYTICS_MONTHS })}
        </button>
      ) : null}
    </div>
  );
}
