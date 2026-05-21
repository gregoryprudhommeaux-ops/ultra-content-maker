"use client";

import {
  countLinkedInCharacters,
  LINKEDIN_POST_CHARACTER_LIMIT,
} from "@/lib/linkedin/character-count";
import { useTranslations } from "next-intl";

type Props = {
  text: string;
  className?: string;
};

export function LinkedInCharCount({ text, className = "" }: Props) {
  const t = useTranslations("setup.articles.detail");
  const count = countLinkedInCharacters(text);
  const max = LINKEDIN_POST_CHARACTER_LIMIT;
  const over = count > max;

  return (
    <p
      className={`text-right text-xs tabular-nums ${over ? "font-medium text-red-600" : "text-ns-secondary"} ${className}`}
      aria-live="polite"
    >
      {t("characterCount", {
        count: count.toLocaleString(),
        max: max.toLocaleString(),
      })}
    </p>
  );
}
