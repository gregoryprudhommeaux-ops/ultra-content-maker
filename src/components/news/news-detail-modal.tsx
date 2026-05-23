"use client";

import { formatNewsDate } from "@/components/news/news-card";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui/nextstep";
import type { NewsSuggestion } from "@/types/workspace";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";

type Props = {
  item: NewsSuggestion | null;
  onClose: () => void;
};

export function NewsDetailModal({ item, onClose }: Props) {
  const t = useTranslations("setup.articles.news");
  const locale = useLocale();

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="news-detail-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col rounded-2xl border border-ns-border bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-gray-100 px-5 py-4 pr-12 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-md p-1.5 text-ns-secondary hover:bg-gray-100 hover:text-ns-tertiary"
            aria-label={t("modalClose")}
          >
            <span aria-hidden className="text-lg leading-none">
              ×
            </span>
          </button>
          <p className="text-xs font-medium text-ns-secondary">
            {item.sourceName ?? t("unknownSource")} · {formatNewsDate(item.publishedAt, locale)}
          </p>
          <h2 id="news-detail-title" className="mt-2 text-lg font-semibold text-ns-tertiary">
            {item.title}
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm leading-relaxed text-ns-secondary whitespace-pre-wrap">
            {item.summary}
          </p>
          <p className="mt-4 text-xs text-ns-secondary">{t("fullArticleHint")}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 border-t border-gray-100 px-5 py-4 sm:justify-end">
          <button type="button" className={BTN_SECONDARY} onClick={onClose}>
            {t("modalClose")}
          </button>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-center ${BTN_PRIMARY}`}
          >
            {t("readSource")}
          </a>
        </div>
      </div>
    </div>
  );
}
