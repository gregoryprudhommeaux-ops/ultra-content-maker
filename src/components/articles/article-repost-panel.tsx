"use client";

import type { RepostSuggestion } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  suggestions: RepostSuggestion[] | null;
  loading: boolean;
  onRegenerate: () => void;
  regenerateDisabled?: boolean;
  expectedTeamCount?: number;
  variant?: "panel" | "inline";
  embedded?: boolean;
};

export function ArticleRepostPanel({
  suggestions,
  loading,
  onRegenerate,
  regenerateDisabled,
  expectedTeamCount,
  variant = "panel",
  embedded = false,
}: Props) {
  const t = useTranslations("setup.articles.repost");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function copyText(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2500);
    } catch {
      /* ignore */
    }
  }

  const isInline = variant === "inline";

  const list =
    suggestions && suggestions.length > 0 ? (
      <ul className="space-y-3">
        {suggestions.map((s, i) => (
          <li
            key={`${s.memberName}-${i}`}
            className="rounded-lg border border-gray-100 bg-white px-3 py-2"
          >
            <p className="text-xs font-semibold text-ns-tertiary">
              {s.memberName}
              {s.memberRole ? (
                <span className="font-normal text-ns-secondary"> · {s.memberRole}</span>
              ) : null}
            </p>
            <p className="mt-1 text-sm text-ns-tertiary whitespace-pre-wrap">{s.repostText}</p>
            <button
              type="button"
              onClick={() => copyText(s.repostText, i)}
              className="mt-2 text-xs font-medium text-ns-primary underline"
            >
              {copiedIndex === i ? t("copied") : t("copy")}
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  const partialCoverage =
    expectedTeamCount != null &&
    expectedTeamCount > 0 &&
    suggestions != null &&
    suggestions.length > 0 &&
    suggestions.length < expectedTeamCount;

  const partialWarning = partialCoverage ? (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      {t("partialCoverage", {
        count: suggestions!.length,
        expected: expectedTeamCount!,
      })}
    </p>
  ) : null;

  if (isInline) {
    return (
      <div className="space-y-3 border-t border-gray-200/80 pt-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ns-tertiary">{t("inlineTitle")}</h3>
            <p className="mt-1 text-xs text-ns-secondary">{t("inlineHint")}</p>
          </div>
          <button
            type="button"
            disabled={loading || regenerateDisabled}
            onClick={onRegenerate}
            className="shrink-0 text-xs font-medium text-ns-tertiary underline hover:text-ns-primary disabled:opacity-50"
          >
            {loading ? "…" : suggestions ? t("regenerate") : t("generateInline")}
          </button>
        </div>
        {loading && !suggestions && (
          <p className="text-xs text-ns-secondary">{t("loading")}</p>
        )}
        {partialWarning}
        {list}
      </div>
    );
  }

  const regenerateButton = (
    <button
      type="button"
      disabled={loading || regenerateDisabled}
      onClick={onRegenerate}
      className="shrink-0 text-xs font-medium text-ns-secondary underline hover:text-ns-tertiary disabled:opacity-50"
    >
      {loading ? "…" : t("regenerate")}
    </button>
  );

  return (
    <section
      className={
        embedded
          ? "space-y-4"
          : "rounded-xl border border-gray-100 bg-ns-brand-light/50 p-5 space-y-4"
      }
    >
      {!embedded ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ns-tertiary">{t("title")}</h2>
            <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
          </div>
          {regenerateButton}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">{regenerateButton}</div>
      )}

      {loading && !suggestions && (
        <p className="text-sm text-ns-secondary">{t("loading")}</p>
      )}

      {partialWarning}

      {list}
    </section>
  );
}
