"use client";

import { formatDealAmount } from "@/lib/admin/support-deal-terms";
import {
  resolveCommercialTerms,
  type SupportQuoteForProposal,
} from "@/lib/admin/support-quote-proposal-shared";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui/nextstep";
import { INPUT_CLASS } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  quote: SupportQuoteForProposal;
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onAccept: (userId: string) => void;
};

export function AdminSupportDealAcceptDialog({
  quote,
  open,
  pending,
  onClose,
  onAccept,
}: Props) {
  const t = useTranslations("adminCommercialProposals.accept");
  const [userId, setUserId] = useState(quote.userId ?? "");

  if (!open) return null;

  const terms = resolveCommercialTerms(quote);
  const locale = quote.locale === "en" || quote.locale === "es" ? quote.locale : "fr";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-ns-border bg-white p-6 shadow-xl"
      >
        <h3 className="text-lg font-bold text-ns-tertiary">{t("title")}</h3>
        <p className="mt-2 text-sm text-ns-secondary">{t("subtitle")}</p>

        <dl className="mt-4 space-y-2 rounded-lg bg-ns-brand-light/30 p-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ns-secondary">{t("client")}</dt>
            <dd className="font-medium text-ns-tertiary">{quote.fullName || quote.companyName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ns-secondary">{t("amount")}</dt>
            <dd className="font-medium text-ns-tertiary">{formatDealAmount(terms, locale)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ns-secondary">{t("commitment")}</dt>
            <dd className="font-medium text-ns-tertiary">
              {t("commitmentValue", { months: terms.minCommitmentMonths })}
            </dd>
          </div>
        </dl>

        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-medium text-ns-tertiary">{t("userId")}</span>
          <input
            className={INPUT_CLASS}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder={t("userIdPlaceholder")}
          />
        </label>
        <p className="mt-1 text-xs text-ns-secondary">{t("userIdHint")}</p>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className={BTN_SECONDARY} disabled={pending} onClick={onClose}>
            {t("cancel")}
          </button>
          <button
            type="button"
            className={BTN_PRIMARY}
            disabled={pending || !userId.trim() || terms.monthlyAmount <= 0}
            onClick={() => onAccept(userId.trim())}
          >
            {pending ? t("pending") : t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
