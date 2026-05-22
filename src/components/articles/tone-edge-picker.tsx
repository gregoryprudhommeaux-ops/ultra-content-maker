"use client";

import type { ToneEdge } from "@/types/workspace";
import { useTranslations } from "next-intl";

const LEVELS: ToneEdge[] = ["default", "corrosive"];

type Props = {
  value: ToneEdge;
  onChange: (edge: ToneEdge) => void;
  className?: string;
};

export function ToneEdgePicker({ value, onChange, className = "" }: Props) {
  const t = useTranslations("setup.articles.toneEdge");

  return (
    <div
      className={`flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-start sm:justify-between ${className}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ns-tertiary">{t("label")}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ns-secondary">
          {t(`hint.${value}`)}
        </p>
      </div>
      <div
        className="flex shrink-0 rounded-lg border border-ns-alternate bg-ns-brand-light p-0.5"
        role="group"
        aria-label={t("label")}
      >
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 ${
              value === level
                ? "bg-ns-surface text-ns-tertiary shadow-sm"
                : "text-ns-secondary hover:text-ns-tertiary"
            }`}
          >
            {t(level)}
          </button>
        ))}
      </div>
    </div>
  );
}
