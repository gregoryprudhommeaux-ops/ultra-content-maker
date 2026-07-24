"use client";

import {
  NARRATIVE_FORMATS,
} from "@/lib/articles/narrative-format";
import type { NarrativePostFormat, PostBrief } from "@/types/workspace";
import { LABEL_CLASS } from "@/types/workspace";
import { ContextHelp } from "@/components/ui/context-help";
import { useTranslations } from "next-intl";

type Props = {
  brief: PostBrief;
  onChange: (brief: PostBrief) => void;
};

export function NarrativeFormatPicker({ brief, onChange }: Props) {
  const t = useTranslations("setup.articles.brief.narrativeFormat");
  const tHelp = useTranslations("setup.articles.brief.help.narrativeFormat");

  const selected = brief.narrativeFormat;

  function select(format: NarrativePostFormat | undefined) {
    const next = { ...brief };
    if (format) {
      next.narrativeFormat = format;
    } else {
      delete next.narrativeFormat;
    }
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <span className={LABEL_CLASS}>{t("title")}</span>
          <ContextHelp label={tHelp("label")}>{tHelp("body")}</ContextHelp>
        </div>
        <p className="mt-1 text-xs text-ns-secondary">{t("hint")}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {NARRATIVE_FORMATS.map((format) => {
          const isSelected = selected === format;
          return (
            <button
              key={format}
              type="button"
              onClick={() => select(format)}
              className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                isSelected
                  ? "border-ns-primary bg-ns-brand-light text-ns-tertiary shadow-[inset_0_0_0_1px_rgba(157,196,26,0.35)]"
                  : "border-gray-100 text-ns-secondary hover:border-ns-primary/40"
              }`}
              aria-pressed={isSelected}
            >
              <span className="block text-sm font-semibold">{t(`formats.${format}`)}</span>
              <span className="mt-1 block text-xs leading-snug text-ns-secondary">
                {t(`descriptions.${format}`)}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => select(undefined)}
        className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
          !selected
            ? "border-ns-primary bg-ns-brand-light text-ns-tertiary"
            : "border-gray-100 text-ns-secondary hover:border-ns-primary/40"
        }`}
        aria-pressed={!selected}
      >
        {t("auto")}
      </button>
    </div>
  );
}
