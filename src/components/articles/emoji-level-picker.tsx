"use client";

import type { EmojiLevel } from "@/types/workspace";
import { useTranslations } from "next-intl";

const LEVELS: EmojiLevel[] = ["none", "light", "heavy"];

type Props = {
  value: EmojiLevel;
  onChange: (level: EmojiLevel) => void;
};

export function EmojiLevelPicker({ value, onChange }: Props) {
  const t = useTranslations("setup.articles.emoji");

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ns-tertiary">{t("label")}</p>
      <div className="flex flex-wrap gap-2">
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={
              value === level
                ? "rounded-sm bg-ns-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-black"
                : "rounded-lg border border-ns-alternate px-4 py-2 text-sm text-ns-tertiary hover:bg-ns-brand-light"
            }
          >
            {t(level)}
          </button>
        ))}
      </div>
      <p className="text-xs text-ns-secondary">{t(`hint.${value}`)}</p>
    </div>
  );
}
