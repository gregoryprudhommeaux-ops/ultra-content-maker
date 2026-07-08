"use client";

import { OptionalLabel } from "@/components/setup/optional-label";
import {
  emptyCompanyOffer,
  MAX_COMPANY_OFFERS,
  showsCompanyProfileFields,
} from "@/lib/persona/company-enrichment";
import { FORM_SUBSECTION_TITLE } from "@/lib/ui/nextstep";
import { INPUT_CLASS } from "@/types/workspace";
import type { CompanyOffer, ContentArchetype } from "@/types/workspace";
import { ImeSafeInput, ImeSafeTextarea } from "@/components/ui/ime-safe-field";
import { useTranslations } from "next-intl";

type Props = {
  archetype: ContentArchetype;
  offers: CompanyOffer[];
  onChange: (offers: CompanyOffer[]) => void;
};

export function CompanyProfileFields({ archetype, offers, onChange }: Props) {
  const t = useTranslations("setup.author.companyProfile");

  if (!showsCompanyProfileFields(archetype)) return null;

  const safeOffers =
    offers.length > 0 ? offers.slice(0, MAX_COMPANY_OFFERS) : [emptyCompanyOffer()];

  function updateOffer(index: number, patch: Partial<CompanyOffer>) {
    const next = [...safeOffers];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function addOffer() {
    if (safeOffers.length >= MAX_COMPANY_OFFERS) return;
    onChange([...safeOffers, emptyCompanyOffer()]);
  }

  function removeOffer(index: number) {
    if (safeOffers.length <= 1) {
      onChange([emptyCompanyOffer()]);
      return;
    }
    onChange(safeOffers.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4 rounded-xl border border-violet-200/80 bg-violet-50/40 p-4">
      <div>
        <h3 className={FORM_SUBSECTION_TITLE}>{t("title")}</h3>
        <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
      </div>

      {safeOffers.map((offer, index) => (
        <div
          key={index}
          className="space-y-3 rounded-lg border border-violet-100 bg-white/90 p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-900/80">
              {index === 0 ? t("primaryOffer") : t("additionalOffer", { index: index + 1 })}
            </p>
            {index > 0 ? (
              <button
                type="button"
                onClick={() => removeOffer(index)}
                className="text-xs font-medium text-red-700 underline"
              >
                {t("removeOffer")}
              </button>
            ) : null}
          </div>

          <div>
            <OptionalLabel htmlFor={`company-offer-name-${index}`} optional={index > 0}>
              {t("offerName")}
            </OptionalLabel>
            <ImeSafeInput
              id={`company-offer-name-${index}`}
              value={offer.name}
              onValueChange={(name) => updateOffer(index, { name })}
              placeholder={t("offerNamePlaceholder")}
              className={INPUT_CLASS}
            />
          </div>

          {index === 0 ? (
            <>
              <div>
                <OptionalLabel htmlFor="company-category-thesis" optional>
                  {t("categoryThesis")}
                </OptionalLabel>
                <p className="mb-2 text-xs text-ns-secondary">{t("categoryThesisHint")}</p>
                <ImeSafeTextarea
                  id="company-category-thesis"
                  rows={2}
                  value={offer.categoryThesis ?? ""}
                  onValueChange={(categoryThesis) => updateOffer(index, { categoryThesis })}
                  placeholder={t("categoryThesisPlaceholder")}
                  className={`${INPUT_CLASS} resize-y`}
                />
              </div>
              <div>
                <OptionalLabel htmlFor="company-proof-points" optional>
                  {t("differentiators")}
                </OptionalLabel>
                <p className="mb-2 text-xs text-ns-secondary">{t("differentiatorsHint")}</p>
                <ImeSafeTextarea
                  id="company-proof-points"
                  rows={2}
                  value={offer.differentiators ?? ""}
                  onValueChange={(differentiators) => updateOffer(index, { differentiators })}
                  placeholder={t("differentiatorsPlaceholder")}
                  className={`${INPUT_CLASS} resize-y`}
                />
              </div>
            </>
          ) : (
            <div>
              <OptionalLabel htmlFor={`company-offer-line-${index}`} optional>
                {t("offerSummary")}
              </OptionalLabel>
              <ImeSafeTextarea
                id={`company-offer-line-${index}`}
                rows={2}
                value={offer.categoryThesis ?? ""}
                onValueChange={(categoryThesis) => updateOffer(index, { categoryThesis })}
                placeholder={t("offerSummaryPlaceholder")}
                className={`${INPUT_CLASS} resize-y`}
              />
            </div>
          )}
        </div>
      ))}

      {safeOffers.length < MAX_COMPANY_OFFERS ? (
        <button
          type="button"
          onClick={addOffer}
          className="text-sm font-medium text-violet-900 underline hover:text-violet-700"
        >
          {t("addOffer", { current: safeOffers.length, max: MAX_COMPANY_OFFERS })}
        </button>
      ) : (
        <p className="text-xs text-ns-secondary">{t("maxOffers", { max: MAX_COMPANY_OFFERS })}</p>
      )}
    </div>
  );
}
