"use client";

import { ContextHelp } from "@/components/ui/context-help";
import type { ArticleBatchGroup } from "@/lib/workspace/articles";
import { useTranslations } from "next-intl";
import type { ContentLanguage } from "@/types/workspace";
import type { ReactNode } from "react";

export const ARTICLE_BATCH_DISPLAY_LIMIT = 10;

type Props = {
  batches: ArticleBatchGroup[];
  locale: ContentLanguage;
  renderBatchCards: (batch: ArticleBatchGroup) => ReactNode;
  formatBatchDateTime: (date: Date, locale: ContentLanguage) => string;
  sessionBadge: (batch: ArticleBatchGroup) => ReactNode;
  scopeMix: (batch: ArticleBatchGroup) => ReactNode;
};

export function ArticlesLibraryBatches({
  batches,
  locale,
  renderBatchCards,
  formatBatchDateTime,
  sessionBadge,
  scopeMix,
}: Props) {
  const t = useTranslations("setup.articles.library");

  const visible = batches.slice(0, ARTICLE_BATCH_DISPLAY_LIMIT);
  const hiddenCount = Math.max(0, batches.length - visible.length);

  return (
    <div className="space-y-3">
      {hiddenCount > 0 ? (
        <p className="text-xs text-ns-secondary">
          {t("batchHiddenNote", { count: hiddenCount })}
        </p>
      ) : null}

      {visible.map((batch, index) => {
        const isLatest = index === 0;
        const title = t("batchTitle", {
          dateTime: formatBatchDateTime(batch.createdAt, locale),
        });
        const countLabel = t("batchCount", { count: batch.articles.length });

        return (
          <details
            key={batch.batchId}
            open={isLatest}
            className="group rounded-2xl border border-gray-100 bg-white shadow-sm"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 border-b border-transparent px-4 py-4 marker:content-none group-open:border-gray-100 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ns-primary">
                  {t("batchEyebrow")}
                </p>
                <h2 className="mt-1 text-base font-bold text-ns-tertiary md:text-lg">{title}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ns-secondary">
                  {scopeMix(batch)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span
                  className="text-ns-secondary transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {sessionBadge(batch)}
                  <span className="rounded-full border border-gray-200 bg-ns-brand-light/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ns-secondary">
                    {countLabel}
                  </span>
                </div>
              </div>
            </summary>
            <div className="px-4 pb-4 pt-3">{renderBatchCards(batch)}</div>
          </details>
        );
      })}
    </div>
  );
}

export function BatchScopeMix({
  generalist,
  niche,
  helpLabel,
  helpBody,
}: {
  generalist: number;
  niche: number;
  helpLabel: string;
  helpBody: string;
}) {
  const t = useTranslations("setup.articles");
  return (
    <>
      <span>{t("scopeMix", { generalist, niche })}</span>
      <ContextHelp label={helpLabel}>{helpBody}</ContextHelp>
    </>
  );
}
