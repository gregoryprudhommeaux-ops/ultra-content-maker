"use client";

import { OptionalLabel } from "@/components/setup/optional-label";
import { MAX_EDITORIAL_PILLARS } from "@/lib/persona/organization-enrichment";
import { FORM_SUBSECTION_TITLE } from "@/lib/ui/nextstep";
import { INPUT_CLASS } from "@/types/workspace";
import type { EditorialPillar } from "@/types/workspace";
import { ImeSafeInput, ImeSafeTextarea } from "@/components/ui/ime-safe-field";
import { useTranslations } from "next-intl";

type Props = {
  pillars: EditorialPillar[];
  onChange: (pillars: EditorialPillar[]) => void;
};

function emptyPillar(): EditorialPillar {
  return { id: "", label: "", description: "", exampleTopics: [] };
}

export function EditorialPillarsEditor({ pillars, onChange }: Props) {
  const t = useTranslations("setup.author.editorialPillars");

  const safe =
    pillars.length > 0 ? pillars.slice(0, MAX_EDITORIAL_PILLARS) : [emptyPillar()];

  function update(index: number, patch: Partial<EditorialPillar>) {
    const next = [...safe];
    const current = next[index];
    const label = patch.label ?? current.label;
    next[index] = {
      ...current,
      ...patch,
      id:
        patch.id ??
        (label.trim()
          ? label.toLowerCase().replace(/\s+/g, "_").slice(0, 48)
          : current.id),
    };
    onChange(next);
  }

  function addPillar() {
    if (safe.length >= MAX_EDITORIAL_PILLARS) return;
    onChange([...safe, emptyPillar()]);
  }

  function removePillar(index: number) {
    const next = safe.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [emptyPillar()]);
  }

  return (
    <div className="space-y-4 rounded-xl border border-amber-200/70 bg-amber-50/30 p-4">
      <div>
        <h3 className={FORM_SUBSECTION_TITLE}>{t("title")}</h3>
        <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
      </div>

      {safe.map((pillar, index) => (
        <div
          key={index}
          className="space-y-2 rounded-lg border border-amber-100 bg-white/90 p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-900/80">
              {t("pillarLabel", { index: index + 1 })}
            </p>
            {safe.length > 1 ? (
              <button
                type="button"
                onClick={() => removePillar(index)}
                className="text-xs font-medium text-red-700 underline"
              >
                {t("remove")}
              </button>
            ) : null}
          </div>
          <div>
            <OptionalLabel htmlFor={`pillar-label-${index}`}>
              {t("label")}
            </OptionalLabel>
            <ImeSafeInput
              id={`pillar-label-${index}`}
              value={pillar.label}
              onValueChange={(label) => update(index, { label })}
              placeholder={t("labelPlaceholder")}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <OptionalLabel htmlFor={`pillar-desc-${index}`} optional>
              {t("description")}
            </OptionalLabel>
            <ImeSafeTextarea
              id={`pillar-desc-${index}`}
              rows={2}
              value={pillar.description ?? ""}
              onValueChange={(description) => update(index, { description })}
              placeholder={t("descriptionPlaceholder")}
              className={`${INPUT_CLASS} min-h-[3rem] resize-y`}
            />
          </div>
          <div>
            <OptionalLabel htmlFor={`pillar-examples-${index}`} optional>
              {t("exampleTopics")}
            </OptionalLabel>
            <ImeSafeTextarea
              id={`pillar-examples-${index}`}
              rows={2}
              value={(pillar.exampleTopics ?? []).join("\n")}
              onValueChange={(text) =>
                update(index, {
                  exampleTopics: text
                    .split(/\n+/)
                    .map((l) => l.trim())
                    .filter(Boolean),
                })
              }
              placeholder={t("exampleTopicsPlaceholder")}
              className={`${INPUT_CLASS} min-h-[3rem] resize-y font-mono text-sm`}
            />
          </div>
        </div>
      ))}

      {safe.length < MAX_EDITORIAL_PILLARS ? (
        <button
          type="button"
          onClick={addPillar}
          className="text-sm font-medium text-ns-primary underline"
        >
          {t("add", { current: safe.filter((p) => p.label.trim()).length, max: MAX_EDITORIAL_PILLARS })}
        </button>
      ) : null}
    </div>
  );
}
