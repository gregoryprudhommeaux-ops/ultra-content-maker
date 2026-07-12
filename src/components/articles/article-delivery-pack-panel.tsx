"use client";

import { buildAgencyDeliveryPack } from "@/lib/articles/agency-delivery-pack";
import type { ArticleIllustration, RepostSuggestion } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type Props = {
  exportText: string;
  illustration?: ArticleIllustration | null;
  repostSuggestions?: RepostSuggestion[] | null;
  pillarLabel?: string;
  articleId?: string;
  variant?: "inline" | "panel";
};

export function ArticleDeliveryPackPanel({
  exportText,
  illustration,
  repostSuggestions,
  pillarLabel,
  articleId,
  variant = "inline",
}: Props) {
  const t = useTranslations("setup.articles.deliveryPack");
  const [copied, setCopied] = useState(false);

  const pack = useMemo(
    () =>
      buildAgencyDeliveryPack({
        exportText,
        illustration,
        repostSuggestions,
        pillarLabel,
      }),
    [exportText, illustration, repostSuggestions, pillarLabel],
  );

  async function copyPack() {
    try {
      await navigator.clipboard.writeText(pack);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  }

  function downloadPack() {
    const blob = new Blob([pack], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delivery-pack-${articleId ?? "post"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isInline = variant === "inline";

  return (
    <div
      className={
        isInline
          ? "space-y-3 border-t border-gray-200/80 pt-4"
          : "rounded-xl border border-gray-100 bg-ns-brand-light/50 p-5 space-y-4"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className={isInline ? "text-sm font-semibold text-ns-tertiary" : "text-base font-semibold text-ns-tertiary"}>
            {t("title")}
          </h3>
          <p className="mt-1 text-xs text-ns-secondary">{t("subtitle")}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void copyPack()}
            className="text-xs font-medium text-ns-primary underline hover:text-ns-tertiary"
          >
            {copied ? t("copied") : t("copyAll")}
          </button>
          <button
            type="button"
            onClick={downloadPack}
            className="text-xs font-medium text-ns-primary underline hover:text-ns-tertiary"
          >
            {t("download")}
          </button>
        </div>
      </div>

      <pre className="max-h-64 overflow-auto rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-ns-tertiary">
        {pack}
      </pre>
    </div>
  );
}
