"use client";

import { FORM_SUBSECTION_TITLE } from "@/lib/ui/nextstep";
import type { ContentArchetype } from "@/types/workspace";
import { useTranslations } from "next-intl";

const OPTIONS: ContentArchetype[] = ["expert", "founder_product", "hybrid"];

type Props = {
  value: ContentArchetype;
  onChange: (value: ContentArchetype) => void;
  idPrefix?: string;
};

export function ContentArchetypePicker({ value, onChange, idPrefix = "archetype" }: Props) {
  const t = useTranslations("setup.author.contentArchetypePicker");

  return (
    <div className="space-y-3">
      <div>
        <h3 className={FORM_SUBSECTION_TITLE}>{t("title")}</h3>
        <p className="mt-1 text-sm text-ns-secondary">{t("hint")}</p>
      </div>
      <fieldset className="grid gap-2 sm:grid-cols-1">
        <legend className="sr-only">{t("title")}</legend>
        {OPTIONS.map((option) => {
          const selected = value === option;
          return (
            <label
              key={option}
              className={[
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                selected
                  ? "border-ns-primary bg-ns-primary/5 ring-1 ring-ns-primary/25"
                  : "border-ns-border bg-white hover:border-ns-primary/40",
              ].join(" ")}
            >
              <input
                type="radio"
                name={`${idPrefix}-contentArchetype`}
                checked={selected}
                onChange={() => onChange(option)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-ns-tertiary">
                  {t(`options.${option}.label`)}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ns-secondary">
                  {t(`options.${option}.hint`)}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>
    </div>
  );
}
