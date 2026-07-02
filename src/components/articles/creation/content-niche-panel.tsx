"use client";

import type { ArticleScope } from "@/types/workspace";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import { ContextHelp } from "@/components/ui/context-help";
import { ImeSafeTextarea } from "@/components/ui/ime-safe-field";
import { useTranslations } from "next-intl";

type Props = {
  contentNiche: string;
  suggestedNiche?: string;
  onContentNicheChange: (value: string) => void;
  onBlurSave?: () => void;
  saving?: boolean;
  targetScope: ArticleScope;
  onScopeChange: (scope: ArticleScope) => void;
};

export function ContentNichePanel({
  contentNiche,
  suggestedNiche,
  onContentNicheChange,
  onBlurSave,
  saving,
  targetScope,
  onScopeChange,
}: Props) {
  const t = useTranslations("setup.articles.nichePanel");
  const tHelp = useTranslations("setup.articles.help.nichePanel");

  const placeholder =
    suggestedNiche?.trim() || t("fieldPlaceholder");

  return (
    <section className="rounded-xl border border-ns-primary/25 bg-gradient-to-br from-ns-brand-light/80 via-white to-white p-4 md:p-5 space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-ns-primary">
          {t("eyebrow")}
        </p>
        <h2 className="mt-1 text-base font-semibold text-ns-tertiary text-balance">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-ns-secondary text-pretty">{t("subtitle")}</p>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <label htmlFor="content-niche" className={LABEL_CLASS}>
            {t("fieldLabel")}
          </label>
          <ContextHelp label={tHelp("label")}>{tHelp("body")}</ContextHelp>
        </div>
        {suggestedNiche && !contentNiche.trim() ? (
          <p className="mt-1 text-xs text-ns-secondary">
            {t("suggestedHint")}: <span className="font-medium text-ns-tertiary">{suggestedNiche}</span>
          </p>
        ) : null}
        <ImeSafeTextarea
          id="content-niche"
          value={contentNiche}
          onValueChange={onContentNicheChange}
          onBlur={() => onBlurSave?.()}
          rows={3}
          placeholder={placeholder}
          className={`${INPUT_CLASS} mt-2 text-sm`}
        />
        {saving ? (
          <p className="mt-1 text-xs text-ns-secondary">{t("saving")}</p>
        ) : contentNiche.trim() ? (
          <p className="mt-1 text-xs text-ns-secondary">{t("saveHint")}</p>
        ) : null}
      </div>

      <div>
        <div className="flex items-center gap-2">
          <span className={LABEL_CLASS}>{t("scopeLabel")}</span>
          <ContextHelp label={tHelp("scopeLabel")}>{tHelp("scopeBody")}</ContextHelp>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["niche", "generalist"] as const).map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => onScopeChange(scope)}
              className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                targetScope === scope
                  ? "border-ns-primary bg-ns-primary text-black"
                  : "border-gray-100 bg-white text-ns-secondary hover:border-ns-primary/40"
              }`}
            >
              {t(`scope.${scope}`)}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-ns-secondary text-pretty">
          {targetScope === "niche" ? t("scopeHintNiche") : t("scopeHintBroader")}
        </p>
      </div>

      <p className="text-xs text-ns-secondary text-pretty border-t border-gray-100 pt-3">
        {t("conversationTip")}
      </p>
    </section>
  );
}
