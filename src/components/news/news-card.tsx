"use client";

import type { NewsSuggestion } from "@/types/workspace";
import { useLocale, useTranslations } from "next-intl";

export function formatNewsDate(iso: string, locale: string) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(t));
}

type Props = {
  item: Pick<
    NewsSuggestion,
    "id" | "title" | "summary" | "url" | "publishedAt" | "sourceName"
  >;
  selected?: boolean;
  onClick?: () => void;
  onRead?: () => void;
  /** Show select/selected label (articles hub picker). */
  showSelectLabel?: boolean;
};

export function NewsCard({
  item,
  selected = false,
  onClick,
  onRead,
  showSelectLabel = false,
}: Props) {
  const t = useTranslations("setup.articles.news");
  const locale = useLocale();

  const className = `h-full w-full rounded-xl border p-4 text-left transition-colors ${
    selected
      ? "border-2 border-ns-primary bg-white shadow-sm"
      : "border-gray-100 bg-white hover:border-ns-primary/40"
  }`;

  const content = (
    <>
      <p className="text-xs font-medium text-ns-secondary">
        {item.sourceName ?? t("unknownSource")} · {formatNewsDate(item.publishedAt, locale)}
      </p>
      <p className="mt-2 line-clamp-2 text-sm font-semibold text-ns-tertiary">{item.title}</p>
      <p className="mt-2 line-clamp-3 text-xs text-ns-secondary">{item.summary}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        {onRead && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRead();
            }}
            className="text-xs font-medium text-ns-tertiary underline hover:text-ns-primary"
          >
            {t("readArticle")}
          </button>
        )}
        {showSelectLabel && (
          <span className="text-xs font-medium text-ns-primary underline">
            {selected ? t("selected") : t("select")}
          </span>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
