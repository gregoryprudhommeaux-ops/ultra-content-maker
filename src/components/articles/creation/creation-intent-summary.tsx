"use client";

import type { WizardCreationMode } from "@/lib/prompts/post-brief";
import { useTranslations } from "next-intl";

type Props = {
  mode: WizardCreationMode;
  onChangeIntent: () => void;
};

/** Compact reminder of the chosen creation path during context / briefing steps. */
export function CreationIntentSummary({ mode, onChangeIntent }: Props) {
  const t = useTranslations("setup.articles.create.intentSummary");

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white px-4 py-2.5 shadow-sm">
      <p className="text-sm text-ns-secondary">
        <span className="font-semibold text-ns-tertiary">{t("label")}</span>{" "}
        {t(`modes.${mode}`)}
      </p>
      <button
        type="button"
        onClick={onChangeIntent}
        className="text-xs font-semibold text-ns-primary underline hover:text-ns-tertiary"
      >
        {t("change")}
      </button>
    </div>
  );
}
