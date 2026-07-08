"use client";

import { offerNamesFromEnrichment } from "@/lib/persona/company-enrichment";
import type { ContentArchetype, GapAnswerValue, PostBrief } from "@/types/workspace";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import { ContextHelp } from "@/components/ui/context-help";
import { ImeSafeInput } from "@/components/ui/ime-safe-field";
import { useTranslations } from "next-intl";

type Props = {
  brief: PostBrief;
  onChange: (brief: PostBrief) => void;
  contentArchetype: ContentArchetype;
  profileEnrichment?: Record<string, GapAnswerValue>;
  layout?: "pills" | "cards";
};

export function PostAnglePicker({
  brief,
  onChange,
  contentArchetype,
  profileEnrichment,
  layout = "pills",
}: Props) {
  const t = useTranslations("setup.articles.brief.postAngle");
  const tHelp = useTranslations("setup.articles.brief.help.postAngle");

  const offerNames = offerNamesFromEnrichment(profileEnrichment);
  const showProductOption =
    contentArchetype === "founder_product" ||
    contentArchetype === "hybrid" ||
    offerNames.length > 0;
  if (!showProductOption) return null;

  const postAngle = brief.postAngle ?? "expertise";

  const shellClass =
    layout === "cards"
      ? "space-y-3"
      : "rounded-xl border border-violet-200/70 bg-violet-50/30 p-4 space-y-3";

  return (
    <div className={shellClass}>
      <div>
        <div className="flex items-center gap-2">
          <span className={LABEL_CLASS}>{t("title")}</span>
          <ContextHelp label={tHelp("label")}>{tHelp("body")}</ContextHelp>
        </div>
        <p className="mt-1 text-xs text-ns-secondary">{t("hint")}</p>
      </div>

      {layout === "cards" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {(["expertise", "product"] as const).map((angle) => {
            const selected = postAngle === angle;
            return (
              <button
                key={angle}
                type="button"
                onClick={() =>
                  onChange({
                    ...brief,
                    postAngle: angle,
                    ...(angle === "product" &&
                    offerNames.length > 0 &&
                    !brief.productFocus
                      ? { productFocus: offerNames[0] }
                      : {}),
                  })
                }
                className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                  selected
                    ? "border-ns-primary bg-ns-brand-light text-ns-tertiary shadow-[inset_0_0_0_1px_rgba(157,196,26,0.35)]"
                    : "border-gray-100 text-ns-secondary hover:border-ns-primary/40"
                }`}
                aria-pressed={selected}
              >
                <span className="block text-sm font-semibold">{t(`angles.${angle}`)}</span>
                <span className="mt-1 block text-xs leading-snug text-ns-secondary">
                  {t(`angleDescriptions.${angle}`)}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(["expertise", "product"] as const).map((angle) => (
            <button
              key={angle}
              type="button"
              onClick={() =>
                onChange({
                  ...brief,
                  postAngle: angle,
                  ...(angle === "product" &&
                  offerNames.length > 0 &&
                  !brief.productFocus
                    ? { productFocus: offerNames[0] }
                    : {}),
                })
              }
              className={[
                "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                postAngle === angle
                  ? "border-violet-600 bg-violet-100 text-violet-950"
                  : "border-gray-100 bg-white text-ns-secondary hover:border-violet-300",
              ].join(" ")}
            >
              {t(`angles.${angle}`)}
            </button>
          ))}
        </div>
      )}

      {postAngle === "product" ? (
        <div className="space-y-2">
          {offerNames.length > 0 ? (
            <div>
              <label className="text-xs font-medium text-ns-secondary" htmlFor="product-focus-select">
                {t("productSelect")}
              </label>
              <select
                id="product-focus-select"
                value={
                  brief.productFocus && offerNames.includes(brief.productFocus)
                    ? brief.productFocus
                    : offerNames[0]
                }
                onChange={(e) => onChange({ ...brief, productFocus: e.target.value })}
                className={`${INPUT_CLASS} mt-1`}
              >
                {offerNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-ns-secondary" htmlFor="product-focus-custom">
                {t("productFocus")}
              </label>
              <ImeSafeInput
                id="product-focus-custom"
                value={brief.productFocus ?? ""}
                onValueChange={(productFocus) => onChange({ ...brief, productFocus })}
                placeholder={t("productFocusPlaceholder")}
                className={`${INPUT_CLASS} mt-1`}
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
