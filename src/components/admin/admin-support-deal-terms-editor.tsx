"use client";

import { defaultCommercialTermsForPlan } from "@/lib/admin/support-deal-terms";
import type { SupportQuoteForProposal } from "@/lib/admin/support-quote-proposal-shared";
import type { SupportCommercialTerms } from "@/types/subscription";
import { BTN_SECONDARY } from "@/lib/ui/nextstep";
import { INPUT_CLASS } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Props = {
  quote: SupportQuoteForProposal;
  pending: boolean;
  onSave: (terms: SupportCommercialTerms) => void;
  onRegenerate: () => void;
};

export function AdminSupportDealTermsEditor({ quote, pending, onSave, onRegenerate }: Props) {
  const t = useTranslations("adminCommercialProposals.terms");
  const initial = quote.commercialTerms ?? defaultCommercialTermsForPlan(quote.plan);
  const [terms, setTerms] = useState<SupportCommercialTerms>(initial);

  useEffect(() => {
    setTerms(quote.commercialTerms ?? defaultCommercialTermsForPlan(quote.plan));
  }, [quote]);

  const isCustom = quote.plan === "much_more";

  return (
    <div className="rounded-xl border border-ns-border bg-white p-4">
      <h4 className="font-bold text-ns-tertiary">{t("title")}</h4>
      <p className="mt-1 text-xs text-ns-secondary">{t("hint")}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-1">
          <span className="mb-1 block font-medium text-ns-tertiary">{t("monthlyAmount")}</span>
          <input
            type="number"
            min={0}
            step={1}
            className={INPUT_CLASS}
            value={terms.monthlyAmount}
            onChange={(e) =>
              setTerms((prev) => ({ ...prev, monthlyAmount: Number(e.target.value) || 0 }))
            }
          />
        </label>
        <label className="block text-sm sm:col-span-1">
          <span className="mb-1 block font-medium text-ns-tertiary">{t("currency")}</span>
          <select
            className={INPUT_CLASS}
            value={terms.currency}
            onChange={(e) =>
              setTerms((prev) => ({
                ...prev,
                currency: e.target.value === "mxn" ? "mxn" : "eur",
              }))
            }
          >
            <option value="eur">EUR</option>
            <option value="mxn">MXN</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ns-tertiary">{t("minCommitment")}</span>
          <input
            type="number"
            min={1}
            className={INPUT_CLASS}
            value={terms.minCommitmentMonths}
            onChange={(e) =>
              setTerms((prev) => ({
                ...prev,
                minCommitmentMonths: Math.max(1, Number(e.target.value) || 1),
              }))
            }
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ns-tertiary">{t("noticePeriod")}</span>
          <input
            type="number"
            min={1}
            className={INPUT_CLASS}
            value={terms.noticePeriodMonths}
            onChange={(e) =>
              setTerms((prev) => ({
                ...prev,
                noticePeriodMonths: Math.max(1, Number(e.target.value) || 1),
              }))
            }
          />
        </label>
        {isCustom ? (
          <>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ns-tertiary">{t("postsCount")}</span>
              <input
                type="number"
                min={1}
                className={INPUT_CLASS}
                value={terms.postsCount ?? 3}
                onChange={(e) =>
                  setTerms((prev) => ({
                    ...prev,
                    postsCount: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ns-tertiary">{t("postsPeriod")}</span>
              <select
                className={INPUT_CLASS}
                value={terms.period ?? "week"}
                onChange={(e) =>
                  setTerms((prev) => ({
                    ...prev,
                    period: e.target.value === "month" ? "month" : "week",
                  }))
                }
              >
                <option value="week">{t("perWeek")}</option>
                <option value="month">{t("perMonth")}</option>
              </select>
            </label>
          </>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={BTN_SECONDARY}
          disabled={pending}
          onClick={() => onSave(terms)}
        >
          {t("save")}
        </button>
        <button
          type="button"
          className={BTN_SECONDARY}
          disabled={pending}
          onClick={onRegenerate}
        >
          {t("regenerateProposal")}
        </button>
      </div>
    </div>
  );
}
