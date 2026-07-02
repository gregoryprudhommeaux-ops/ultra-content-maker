"use client";

import { NewsCard } from "@/components/news/news-card";
import type { ArchivedNewsDoc, NewsScanGroup } from "@/lib/workspace/news-archive";
import { useTranslations } from "next-intl";
import type { ContentLanguage } from "@/types/workspace";

type Props = {
  scans: NewsScanGroup[];
  locale: ContentLanguage;
  selectedId: string | null;
  onSelect: (item: ArchivedNewsDoc) => void;
  onRead: (item: ArchivedNewsDoc) => void;
};

function formatScanLabel(date: Date, locale: ContentLanguage): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function NewsArchiveScans({
  scans,
  locale,
  selectedId,
  onSelect,
  onRead,
}: Props) {
  const t = useTranslations("setup.news");

  return (
    <div className="space-y-3">
      {scans.map((scan, index) => {
        const isLatest = index === 0;
        const label = t("scanGroupTitle", {
          dateTime: formatScanLabel(scan.scannedAt, locale),
        });
        const countLabel = t("scanGroupCount", { count: scan.items.length });

        return (
          <details
            key={scan.batchKey}
            open={isLatest}
            className="group rounded-xl border border-gray-100 bg-white shadow-sm"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-semibold text-ns-tertiary">{label}</p>
                <p className="mt-0.5 text-xs text-ns-secondary">{countLabel}</p>
              </div>
              <span
                className="shrink-0 text-ns-secondary transition-transform duration-200 group-open:rotate-180"
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
            </summary>
            <div className="border-t border-gray-100 px-4 pb-4 pt-3">
              <ul className="grid gap-3 sm:grid-cols-2">
                {scan.items.map((item) => (
                  <li key={item.id}>
                    <NewsCard
                      item={item}
                      selected={selectedId === item.id}
                      showSelectLabel
                      onClick={() => onSelect(item)}
                      onRead={() => onRead(item)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </details>
        );
      })}
    </div>
  );
}
