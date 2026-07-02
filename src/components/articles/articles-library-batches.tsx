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

function BatchChevron() {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-ns-brand-light text-ns-secondary transition-all duration-200 group-hover:border-ns-primary/25 group-hover:bg-ns-primary/10 group-open:border-ns-primary/30 group-open:bg-ns-primary/15 group-open:text-ns-tertiary"
      aria-hidden
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        className="transition-transform duration-200 group-open:rotate-180"
      >
        <path
          d="M6 9l6 6 6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

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
        <p className="rounded-xl border border-dashed border-gray-200 bg-ns-brand-light/50 px-4 py-2.5 text-xs text-ns-secondary">
          {t("batchHiddenNote", { count: hiddenCount })}
        </p>
      ) : null}

      {visible.map((batch, index) => {
        const isLatest = index === 0;
        const dateTime = formatBatchDateTime(batch.createdAt, locale);
        const title = t("batchTitle", { dateTime });
        const countLabel = t("batchCount", { count: batch.articles.length });
        const summaryAria = t("batchSummaryAria", {
          dateTime,
          count: batch.articles.length,
        });

        return (
          <details
            key={batch.batchId}
            open={isLatest}
            className={[
              "group rounded-2xl border bg-white transition-shadow duration-200",
              isLatest
                ? "border-ns-primary/30 shadow-md ring-1 ring-ns-primary/10"
                : "border-gray-100 shadow-sm hover:border-gray-200 hover:shadow",
            ].join(" ")}
          >
            <summary
              aria-label={summaryAria}
              className={[
                "flex cursor-pointer list-none items-start gap-3 border-b border-transparent px-4 py-4 marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-primary/50 focus-visible:ring-offset-2 md:gap-4 md:px-5 md:py-4 [&::-webkit-details-marker]:hidden",
                "group-open:border-gray-100",
                isLatest
                  ? "rounded-t-2xl bg-gradient-to-br from-white via-white to-ns-brand-light/70"
                  : "rounded-2xl bg-white/90 hover:bg-ns-brand-light/40 group-open:rounded-b-none group-open:bg-white",
              ].join(" ")}
            >
              <BatchChevron />

              <div className="min-w-0 flex-1 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={[
                      "text-[11px] font-bold uppercase tracking-[0.16em]",
                      isLatest ? "text-ns-primary" : "text-ns-secondary",
                    ].join(" ")}
                  >
                    {isLatest ? t("batchLatestEyebrow") : t("batchEyebrow")}
                  </p>
                  {isLatest ? (
                    <span className="rounded-full bg-ns-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ns-tertiary">
                      {t("batchLatestBadge")}
                    </span>
                  ) : null}
                </div>
                <h2
                  className={[
                    "mt-1 font-bold text-ns-tertiary",
                    isLatest ? "text-base md:text-lg" : "text-sm md:text-base",
                  ].join(" ")}
                >
                  <time dateTime={batch.createdAt.toISOString()}>{title}</time>
                </h2>
                <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ns-secondary">
                  {scopeMix(batch)}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {sessionBadge(batch)}
                  <span
                    className={[
                      "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide tabular-nums",
                      isLatest
                        ? "border-ns-primary/25 bg-ns-primary/10 text-ns-tertiary"
                        : "border-gray-200 bg-ns-brand-light/60 text-ns-secondary",
                    ].join(" ")}
                  >
                    {countLabel}
                  </span>
                </div>
              </div>
            </summary>
            <div
              className={[
                "px-4 pb-4 pt-3 md:px-5 md:pb-5",
                isLatest ? "bg-gradient-to-b from-ns-brand-light/30 to-white" : "bg-white",
              ].join(" ")}
            >
              {renderBatchCards(batch)}
            </div>
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
      <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-ns-secondary">
        {t("scopeMix", { generalist, niche })}
      </span>
      <ContextHelp label={helpLabel}>{helpBody}</ContextHelp>
    </>
  );
}
