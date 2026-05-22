"use client";

import { NewsCard } from "@/components/news/news-card";
import { BTN_PRIMARY_SM } from "@/lib/ui/nextstep";
import { Link } from "@/i18n/navigation";
import type { NewsSuggestion } from "@/types/workspace";
import { useTranslations } from "next-intl";

type Props = {
  news: NewsSuggestion[];
  selectedId: string | null;
  onSelect: (item: NewsSuggestion) => void;
  loading: boolean;
  onRefresh: () => void;
  perplexityHint?: boolean;
  onGenerateBatch?: () => void;
  generatingBatch?: boolean;
};

export function NewsPickerPanel({
  news,
  selectedId,
  onSelect,
  loading,
  onRefresh,
  perplexityHint,
  onGenerateBatch,
  generatingBatch = false,
}: Props) {
  const t = useTranslations("setup.articles.news");
  const tArticles = useTranslations("setup.articles");

  return (
    <section className="rounded-xl border border-gray-100 bg-ns-brand-light/40 p-4 md:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ns-tertiary">{t("title")}</h2>
          <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
          {perplexityHint && (
            <p className="mt-2 text-xs text-amber-800">{t("perplexityHint")}</p>
          )}
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={onRefresh}
          className="shrink-0 text-sm font-medium text-ns-tertiary underline hover:text-ns-primary disabled:opacity-50"
        >
          {loading ? "…" : t("refresh")}
        </button>
      </div>

      {loading && news.length === 0 && (
        <p className="text-sm text-ns-secondary">{t("loading")}</p>
      )}

      {!loading && news.length === 0 && (
        <p className="text-sm text-ns-secondary">{t("empty")}</p>
      )}

      {news.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {news.map((item) => (
            <li key={item.id}>
              <NewsCard
                item={item}
                selected={selectedId === item.id}
                onClick={() => onSelect(item)}
                showSelectLabel
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 border-t border-gray-100 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {onGenerateBatch && (
          <button
            type="button"
            disabled={generatingBatch}
            onClick={onGenerateBatch}
            className={BTN_PRIMARY_SM}
          >
            {generatingBatch ? tArticles("generating") : tArticles("generateBatch")}
          </button>
        )}
        <Link
          href="/news"
          className="text-sm font-medium text-ns-tertiary underline hover:text-ns-primary"
        >
          {t("previousNews")}
        </Link>
      </div>
    </section>
  );
}
