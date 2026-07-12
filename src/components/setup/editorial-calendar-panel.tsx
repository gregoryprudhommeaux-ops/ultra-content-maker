"use client";

import { OptionalLabel } from "@/components/setup/optional-label";
import {
  emptyEditorialCalendarEntry,
  MAX_EDITORIAL_CALENDAR_ENTRIES,
} from "@/lib/persona/organization-enrichment";
import { FORM_SUBSECTION_TITLE } from "@/lib/ui/nextstep";
import { INPUT_CLASS } from "@/types/workspace";
import type { EditorialCalendarEntry, EditorialPillar } from "@/types/workspace";
import { ImeSafeInput } from "@/components/ui/ime-safe-field";
import { useTranslations } from "next-intl";

type Props = {
  entries: EditorialCalendarEntry[];
  pillars: EditorialPillar[];
  onChange: (entries: EditorialCalendarEntry[]) => void;
};

export function EditorialCalendarPanel({ entries, pillars, onChange }: Props) {
  const t = useTranslations("setup.author.editorialCalendar");

  const pillarOptions = pillars.filter((p) => p.label.trim());
  const safe =
    entries.length > 0
      ? entries.slice(0, MAX_EDITORIAL_CALENDAR_ENTRIES)
      : [emptyEditorialCalendarEntry()];

  function update(index: number, patch: Partial<EditorialCalendarEntry>) {
    const next = [...safe];
    next[index] = { ...next[index]!, ...patch };
    onChange(next);
  }

  function addEntry() {
    if (safe.length >= MAX_EDITORIAL_CALENDAR_ENTRIES) return;
    onChange([...safe, emptyEditorialCalendarEntry()]);
  }

  function removeEntry(index: number) {
    const next = safe.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [emptyEditorialCalendarEntry()]);
  }

  return (
    <div className="space-y-4 rounded-xl border border-sky-200/70 bg-sky-50/30 p-4">
      <div>
        <h3 className={FORM_SUBSECTION_TITLE}>{t("title")}</h3>
        <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
      </div>

      {pillarOptions.length === 0 && (
        <p className="text-sm text-amber-800">{t("needPillars")}</p>
      )}

      {safe.map((entry, index) => (
        <div
          key={entry.id || index}
          className="space-y-2 rounded-lg border border-sky-100 bg-white/90 p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-900/80">
              {t("entryLabel", { index: index + 1 })}
            </p>
            {safe.length > 1 ? (
              <button
                type="button"
                onClick={() => removeEntry(index)}
                className="text-xs font-medium text-red-700 underline"
              >
                {t("remove")}
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <OptionalLabel htmlFor={`cal-date-${index}`}>{t("plannedDate")}</OptionalLabel>
              <input
                id={`cal-date-${index}`}
                type="date"
                value={entry.plannedDate}
                onChange={(e) => update(index, { plannedDate: e.target.value })}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <OptionalLabel htmlFor={`cal-pillar-${index}`}>{t("pillar")}</OptionalLabel>
              <select
                id={`cal-pillar-${index}`}
                value={entry.pillarId}
                onChange={(e) => update(index, { pillarId: e.target.value })}
                className={INPUT_CLASS}
              >
                <option value="">{t("pillarPlaceholder")}</option>
                {pillarOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <OptionalLabel htmlFor={`cal-topic-${index}`} optional>
              {t("topicHint")}
            </OptionalLabel>
            <ImeSafeInput
              id={`cal-topic-${index}`}
              value={entry.topicHint ?? ""}
              onValueChange={(topicHint) => update(index, { topicHint })}
              placeholder={t("topicHintPlaceholder")}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <OptionalLabel htmlFor={`cal-status-${index}`}>{t("status")}</OptionalLabel>
            <select
              id={`cal-status-${index}`}
              value={entry.status}
              onChange={(e) =>
                update(index, {
                  status: e.target.value as EditorialCalendarEntry["status"],
                })
              }
              className={INPUT_CLASS}
            >
              <option value="planned">{t("statusPlanned")}</option>
              <option value="in_progress">{t("statusInProgress")}</option>
              <option value="published">{t("statusPublished")}</option>
            </select>
          </div>
        </div>
      ))}

      {safe.length < MAX_EDITORIAL_CALENDAR_ENTRIES ? (
        <button
          type="button"
          onClick={addEntry}
          className="text-sm font-medium text-ns-primary underline"
        >
          {t("add", { current: safe.filter((e) => e.pillarId.trim()).length, max: MAX_EDITORIAL_CALENDAR_ENTRIES })}
        </button>
      ) : null}
    </div>
  );
}
