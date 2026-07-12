"use client";

import type { ArticleIllustration, IllustrationFormat } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
 illustration: ArticleIllustration | null;
 loading: boolean;
 onRegenerate: () => void;
 regenerateDisabled?: boolean;
 /** Compact block below validated post text (prompts only). */
 variant?: "panel" | "inline";
 /** Hide outer title when nested in EditorCollapsibleSection. */
 embedded?: boolean;
};

export function ArticleIllustrationPanel({
 illustration,
 loading,
 onRegenerate,
 regenerateDisabled,
 variant = "panel",
 embedded = false,
}: Props) {
 const t = useTranslations("setup.articles.illustration");
 const [copiedIndex, setCopiedIndex] = useState<
 number | "keywords" | "concept" | "overlayTitle" | "overlaySubtitle" | "canva" | null
 >(null);

 async function copyText(
 text: string,
 key: number | "keywords" | "concept" | "overlayTitle" | "overlaySubtitle" | "canva",
 ) {
 try {
 await navigator.clipboard.writeText(text);
 setCopiedIndex(key);
 setTimeout(() => setCopiedIndex(null), 2500);
 } catch {
 /* ignore */
 }
 }

 const isInline = variant === "inline";

 const promptsList = illustration ? (
 <ol className="space-y-3">
 {illustration.imagePrompts.map((prompt, i) => (
 <li
 key={i}
 className="rounded-lg border border-gray-100 bg-white px-3 py-2"
 >
 <p className="text-xs font-medium text-ns-secondary">
 {t("promptLabel", { n: i + 1 })}
 </p>
 <p className="mt-1 text-sm text-ns-tertiary">{prompt}</p>
 <button
 type="button"
 onClick={() => copyText(prompt, i)}
 className="mt-2 text-xs font-medium text-ns-primary underline"
 >
 {copiedIndex === i ? t("copied") : t("copy")}
 </button>
 </li>
 ))}
 </ol>
 ) : null;

 const visualPack =
 illustration &&
 (illustration.visualConcept ||
 illustration.overlayTitle ||
 illustration.overlaySubtitle ||
 illustration.canvaPrompt) ? (
 <div className="space-y-3 rounded-lg border border-ns-primary/20 bg-white px-3 py-3">
 <p className="text-xs font-semibold uppercase tracking-wide text-ns-secondary">
 {t("visualPackTitle")}
 </p>
 {illustration.visualConcept ? (
 <div>
 <p className="text-xs font-medium text-ns-secondary">{t("visualConcept")}</p>
 <p className="mt-1 text-sm text-ns-tertiary">{illustration.visualConcept}</p>
 <button
 type="button"
 onClick={() => copyText(illustration.visualConcept!, "concept")}
 className="mt-2 text-xs font-medium text-ns-primary underline"
 >
 {copiedIndex === "concept" ? t("copied") : t("copy")}
 </button>
 </div>
 ) : null}
 {(illustration.overlayTitle || illustration.overlaySubtitle) && (
 <div className="space-y-2">
 <p className="text-xs font-medium text-ns-secondary">{t("overlayText")}</p>
 {illustration.overlayTitle ? (
 <div className="rounded border border-gray-100 bg-gray-50/80 px-2 py-1.5">
 <p className="text-[10px] uppercase text-ns-secondary">{t("overlayTitle")}</p>
 <p className="text-sm font-medium text-ns-tertiary">{illustration.overlayTitle}</p>
 <button
 type="button"
 onClick={() => copyText(illustration.overlayTitle!, "overlayTitle")}
 className="mt-1 text-xs font-medium text-ns-primary underline"
 >
 {copiedIndex === "overlayTitle" ? t("copied") : t("copy")}
 </button>
 </div>
 ) : null}
 {illustration.overlaySubtitle ? (
 <div className="rounded border border-gray-100 bg-gray-50/80 px-2 py-1.5">
 <p className="text-[10px] uppercase text-ns-secondary">{t("overlaySubtitle")}</p>
 <p className="text-sm text-ns-tertiary">{illustration.overlaySubtitle}</p>
 <button
 type="button"
 onClick={() => copyText(illustration.overlaySubtitle!, "overlaySubtitle")}
 className="mt-1 text-xs font-medium text-ns-primary underline"
 >
 {copiedIndex === "overlaySubtitle" ? t("copied") : t("copy")}
 </button>
 </div>
 ) : null}
 </div>
 )}
 {illustration.canvaPrompt ? (
 <div>
 <p className="text-xs font-medium text-ns-secondary">{t("canvaPrompt")}</p>
 <p className="mt-1 text-sm text-ns-tertiary">{illustration.canvaPrompt}</p>
 <button
 type="button"
 onClick={() => copyText(illustration.canvaPrompt!, "canva")}
 className="mt-2 text-xs font-medium text-ns-primary underline"
 >
 {copiedIndex === "canva" ? t("copied") : t("copy")}
 </button>
 </div>
 ) : null}
 </div>
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
 {loading ? "…" : illustration ? t("regenerate") : t("generateInline")}
 </button>
 </div>

 {loading && !illustration && (
 <p className="text-xs text-ns-secondary">{t("loading")}</p>
 )}

 {illustration && (
 <div className="space-y-3">
 <p className="text-xs text-ns-secondary">
 <span className="font-semibold text-ns-tertiary">
 {t(`formats.${illustration.format}`)}
 </span>
 {illustration.rationale ? ` · ${illustration.rationale}` : ""}
 </p>
 {visualPack}
 {illustration.searchKeywords && (
 <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2">
 <span className="text-xs font-medium text-ns-secondary">{t("search")}</span>
 <span className="flex-1 text-xs text-ns-tertiary">
 {illustration.searchKeywords}
 </span>
 <button
 type="button"
 onClick={() => copyText(illustration.searchKeywords!, "keywords")}
 className="text-xs font-medium text-ns-primary underline"
 >
 {copiedIndex === "keywords" ? t("copied") : t("copy")}
 </button>
 </div>
 )}
 <div>
 <p className="text-xs font-semibold uppercase tracking-wide text-ns-secondary">
 {t("promptsTitle")}
 </p>
 <p className="mt-1 text-xs text-ns-secondary">{t("promptsHint")}</p>
 <div className="mt-2">{promptsList}</div>
 </div>
 </div>
 )}
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
 <section className={embedded ? "space-y-4" : "rounded-xl border border-gray-100 bg-ns-brand-light/50 p-5 space-y-4"}>
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

 {loading && !illustration && (
 <p className="text-sm text-ns-secondary">{t("loading")}</p>
 )}

 {illustration && (
 <div className="space-y-4">
 <div>
 <p className="text-xs font-semibold uppercase tracking-wide text-ns-secondary">
 {t("recommendedFormat")}
 </p>
 <p className="mt-1 text-sm font-medium text-ns-tertiary">
 {t(`formats.${illustration.format}`)}
 </p>
 {illustration.alternativeFormats &&
 illustration.alternativeFormats.length > 0 && (
 <p className="mt-1 text-xs text-ns-secondary">
 {t("alternatives")}:{" "}
 {illustration.alternativeFormats
 .map((f) => t(`formats.${f as IllustrationFormat}`))
 .join(" · ")}
 </p>
 )}
 </div>

 <p className="text-sm leading-relaxed text-ns-tertiary">{illustration.rationale}</p>

 {visualPack}

 {illustration.searchKeywords && (
 <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2">
 <span className="text-xs font-medium text-ns-secondary">{t("search")}</span>
 <span className="flex-1 text-sm text-ns-tertiary">
 {illustration.searchKeywords}
 </span>
 <button
 type="button"
 onClick={() => copyText(illustration.searchKeywords!, "keywords")}
 className="text-xs font-medium text-ns-tertiary underline"
 >
 {copiedIndex === "keywords" ? t("copied") : t("copy")}
 </button>
 </div>
 )}

 <div>
 <p className="text-xs font-semibold uppercase tracking-wide text-ns-secondary">
 {t("promptsTitle")}
 </p>
 <p className="mt-1 text-xs text-ns-secondary">{t("promptsHint")}</p>
 <div className="mt-3">{promptsList}</div>
 </div>
 </div>
 )}
 </section>
 );
}
