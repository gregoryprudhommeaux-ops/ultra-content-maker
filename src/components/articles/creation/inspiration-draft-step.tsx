"use client";

import { WizardStepActions, WizardStepCard } from "@/components/articles/creation/wizard-step-card";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import { useTranslations } from "next-intl";

type Props = {
  excerpt: string;
  onExcerptChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
};

const MIN_CHARS = 40;

/** Paste an existing LinkedIn draft for revision (anti-slop / voice), not a third-party source. */
export function InspirationDraftStep({
  excerpt,
  onExcerptChange,
  onContinue,
  onBack,
}: Props) {
  const t = useTranslations("setup.articles.create.inspiration");
  const ready = excerpt.trim().length >= MIN_CHARS;

  return (
    <WizardStepCard title={t("draftTitle")} hint={t("draftSubtitle")} onBack={onBack}>
      <div className="space-y-4">
        <p className="text-sm text-ns-secondary">{t("draftIntro")}</p>
        <div>
          <label className={LABEL_CLASS} htmlFor="inspiration-draft">
            {t("draftLabel")}
          </label>
          <textarea
            id="inspiration-draft"
            value={excerpt}
            onChange={(e) => onExcerptChange(e.target.value)}
            rows={12}
            placeholder={t("draftPlaceholder")}
            className={`${INPUT_CLASS} mt-1.5 min-h-[220px] font-normal leading-relaxed`}
          />
          <p className="mt-1.5 text-xs text-ns-secondary">
            {t("draftHint", { min: MIN_CHARS, count: excerpt.trim().length })}
          </p>
        </div>
        <WizardStepActions onBack={onBack}>
          <button
            type="button"
            disabled={!ready}
            onClick={onContinue}
            className={`${BTN_PRIMARY} disabled:opacity-50`}
          >
            {t("draftContinue")}
          </button>
        </WizardStepActions>
      </div>
    </WizardStepCard>
  );
}
