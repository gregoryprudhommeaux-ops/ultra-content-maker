"use client";

import type { ArticleNewsSource, NewsSuggestion } from "@/types/workspace";
import { useLocale, useTranslations } from "next-intl";

type Props = {
  news: NewsSuggestion[];
  selectedId: string | null;
  onSelect: (item: NewsSuggestion) => void;
  loading: boolean;
  onRefresh: () => void;
  perplexityHint?: boolean;
};

export function newsToSource(item: NewsSuggestion): ArticleNewsSource {
  return {
    title: item.title,
    summary: item.summary,
    url: item.url,
    publishedAt: item.publishedAt,
    sourceName: item.sourceName,
  };
}

function formatNewsDate(iso: string, locale: string) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(t));
}

export function NewsPickerPanel({
  news,
  selectedId,
  onSelect,
  loading,
  onRefresh,
  perplexityHint,
}: Props) {
  const t = useTranslations("setup.articles.news");
  const locale = useLocale();

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
          {news.map((item) => {
            const selected = selectedId === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className={`h-full w-full rounded-xl border p-4 text-left transition-colors ${
                    selected
                      ? "border-2 border-ns-primary bg-white shadow-sm"
                      : "border-gray-100 bg-white hover:border-ns-primary/40"
                  }`}
                >
                  <p className="text-xs font-medium text-ns-secondary">
                    {item.sourceName ?? t("unknownSource")} ·{" "}
                    {formatNewsDate(item.publishedAt, locale)}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ns-tertiary line-clamp-2">
                    {item.title}
                  </p>
                  <p className="mt-2 text-xs text-ns-secondary line-clamp-3">
                    {item.summary}
                  </p>
                  <span className="mt-2 inline-block text-xs font-medium text-ns-primary underline">
                    {selected ? t("selected") : t("select")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
