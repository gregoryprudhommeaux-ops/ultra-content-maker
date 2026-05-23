"use client";

import { formatNewsDate } from "@/components/news/news-card";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import type { NewsSuggestion } from "@/types/workspace";
import { useLocale, useTranslations } from "next-intl";

type Props = {
  item: NewsSuggestion;
  pending: boolean;
  onGenerate: () => void;
  onChangeSelection: () => void;
  onReadArticle: () => void;
};

export function SelectedNewsActionPanel({
  item,
  pending,
  onGenerate,
  onChangeSelection,
  onReadArticle,
}: Props) {
  const t = useTranslations("setup.articles.news");
  const locale = useLocale();

  return (
    <section
      className="rounded-xl border-2 border-ns-primary/50 bg-gradient-to-b from-ns-primary/10 to-white p-5 shadow-sm space-y-4"
      aria-labelledby="selected-news-action-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-ns-tertiary">
            {t("selectedBadge")}
          </p>
          <h3
            id="selected-news-action-title"
            className="text-base font-semibold text-ns-tertiary"
          >
            {t("selectedTitle")}
          </h3>
        </div>
        <button
          type="button"
          onClick={onChangeSelection}
          className="text-sm font-medium text-ns-secondary underline hover:text-ns-tertiary"
        >
          {t("changeNews")}
        </button>
      </div>

      <div className="rounded-lg border border-gray-100 bg-white/90 px-4 py-3">
        <p className="text-xs font-medium text-ns-secondary">
          {item.sourceName ?? t("unknownSource")} · {formatNewsDate(item.publishedAt, locale)}
        </p>
        <p className="mt-2 text-sm font-semibold text-ns-tertiary">{item.title}</p>
        <button
          type="button"
          onClick={onReadArticle}
          className="mt-2 text-xs font-medium text-ns-primary underline hover:text-ns-tertiary"
        >
          {t("readArticle")}
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-ns-tertiary">
          {t("selectedNextStep")}
        </p>
        <p className="text-sm leading-relaxed text-ns-secondary">{t("selectedExplain")}</p>
        <p className="text-xs text-ns-secondary/90">{t("citationNote")}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          disabled={pending}
          onClick={onGenerate}
          className={BTN_PRIMARY}
        >
          {pending ? t("generatingFromNews") : t("generateFromNews")}
        </button>
        <p className="text-xs text-ns-secondary sm:max-w-md">{t("generateFromNewsHint")}</p>
      </div>
    </section>
  );
}
