"use client";

import type { EmojiLevel } from "@/types/workspace";
import { useTranslations } from "next-intl";

const LEVELS: EmojiLevel[] = ["none", "light", "heavy"];

type Props = {
  value: EmojiLevel;
  onChange: (level: EmojiLevel) => void;
  className?: string;
  variant?: "default" | "compact";
};

function SegmentButtons({
  value,
  onChange,
  compact,
}: {
  value: EmojiLevel;
  onChange: (level: EmojiLevel) => void;
  compact?: boolean;
}) {
  const t = useTranslations("setup.emoji");

  return (
    <div
      className={`flex rounded-lg border border-ns-alternate bg-ns-brand-light p-0.5 ${
        compact ? "shrink-0" : ""
      }`}
      role="group"
      aria-label={t("label")}
    >
      {LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => onChange(level)}
          className={`rounded-md font-semibold transition-colors ${
            compact ? "px-2.5 py-1.5 text-xs sm:px-3" : "flex-1 px-2 py-2 text-sm sm:px-3"
          } ${
            value === level
              ? "bg-ns-surface text-ns-tertiary shadow-sm"
              : "text-ns-secondary hover:text-ns-tertiary"
          }`}
        >
          {t(level)}
        </button>
      ))}
    </div>
  );
}

export function EmojiLevelPicker({
  value,
  onChange,
  className = "",
  variant = "default",
}: Props) {
  const t = useTranslations("setup.emoji");

  if (variant === "compact") {
    return (
      <div
        className={`flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-ns-tertiary">{t("label")}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ns-secondary">
            {t(`hint.${value}`)}
          </p>
        </div>
        <SegmentButtons value={value} onChange={onChange} compact />
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="mb-2 text-xs font-semibold text-ns-secondary">{t("label")}</p>
      <SegmentButtons value={value} onChange={onChange} />
      <p className="mt-2 text-xs leading-relaxed text-ns-secondary">{t(`hint.${value}`)}</p>
    </div>
  );
}
