"use client";

import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import { ImeSafeTextarea } from "@/components/ui/ime-safe-field";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Props = {
  newsInterestQuery: string;
  onNewsInterestChange: (value: string) => void;
  onSearch: () => void;
  searching: boolean;
  errorMessage?: string | null;
  errorCode?: string | null;
};

export function NewsEmptyRefinePanel({
  newsInterestQuery,
  onNewsInterestChange,
  onSearch,
  searching,
  errorMessage,
  errorCode,
}: Props) {
  const t = useTranslations("setup.articles.news");

  const hintKey =
    errorCode === "all_filtered_by_date"
      ? "refineHintFiltered"
      : errorCode === "no_llm_results"
        ? "refineHintNoLlm"
        : "refineHintDefault";

  return (
    <div className="space-y-4 rounded-xl border border-amber-200/80 bg-amber-50/60 p-4">
      <div>
        <h3 className="text-sm font-semibold text-ns-tertiary">{t("refineTitle")}</h3>
        <p className="mt-1 text-sm text-ns-secondary">{t(hintKey)}</p>
        {errorMessage && (
          <p className="mt-2 text-sm text-amber-900">{errorMessage}</p>
        )}
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="news-interest-query">
          {t("refineLabel")}
        </label>
        <ImeSafeTextarea
          id="news-interest-query"
          rows={3}
          value={newsInterestQuery}
          onValueChange={onNewsInterestChange}
          placeholder={t("refinePlaceholder")}
          className={`${INPUT_CLASS} mt-1 text-sm`}
        />
        <p className="mt-1 text-xs text-ns-secondary">{t("refineHelp")}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={searching || newsInterestQuery.trim().length < 3}
          onClick={onSearch}
          className={`${BTN_PRIMARY} disabled:opacity-50`}
        >
          {searching ? t("loading") : t("refineSearch")}
        </button>
        <Link
          href="/setup/author"
          className="self-center text-sm font-medium text-ns-tertiary underline"
        >
          {t("refineProfileLink")}
        </Link>
      </div>
    </div>
  );
}
