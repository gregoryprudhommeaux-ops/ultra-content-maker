"use client";

import {
  buildDefaultProposalDraft,
  type QuoteContentLocale,
  type SupportQuoteForProposal,
  type SupportQuoteProposalDraft,
  type SupportQuoteProposalLocaleContent,
} from "@/lib/admin/support-quote-proposal-shared";
import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui/nextstep";
import { INPUT_CLASS } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

const LOCALES: QuoteContentLocale[] = ["fr", "en", "es"];

type Props = {
  quote: SupportQuoteForProposal;
  pending: boolean;
  onPatch: (
    action:
      | "regenerate_proposal"
      | "save_proposal"
      | "send_proposal"
      | "save_commercial_terms",
    payload?: {
      proposalDraft?: SupportQuoteProposalDraft;
      sendLocale?: QuoteContentLocale;
      emailSubject?: string;
      emailBody?: string;
      commercialTerms?: import("@/types/subscription").SupportCommercialTerms;
    },
  ) => void;
};

export function AdminSupportQuoteProposalEditor({ quote, pending, onPatch }: Props) {
  const t = useTranslations("adminSupportQuotes.proposal");
  const { user } = useAuth();
  const [pdfPending, setPdfPending] = useState(false);
  const initial = useMemo(
    () => quote.proposalDraft ?? buildDefaultProposalDraft(quote),
    [quote],
  );
  const [draft, setDraft] = useState<SupportQuoteProposalDraft>(initial);
  const [activeLocale, setActiveLocale] = useState<QuoteContentLocale>(
    quote.locale === "en" || quote.locale === "es" ? quote.locale : "fr",
  );
  const [sendLocale, setSendLocale] = useState<QuoteContentLocale>(
    quote.locale === "en" || quote.locale === "es" ? quote.locale : "fr",
  );
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  useEffect(() => {
    setDraft(quote.proposalDraft ?? buildDefaultProposalDraft(quote));
  }, [quote]);

  useEffect(() => {
    const content = draft[sendLocale];
    setEmailSubject(content.subject);
    setEmailBody(content.body);
  }, [draft, sendLocale]);

  const content = draft[activeLocale];

  function updateLocale(field: keyof SupportQuoteProposalLocaleContent, value: string) {
    setDraft((prev) => ({
      ...prev,
      [activeLocale]: { ...prev[activeLocale], [field]: value },
    }));
  }

  async function onDownloadPdf() {
    if (!user) return;
    setPdfPending(true);
    try {
      const auth = getClientAuth();
      const token = await auth?.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch(
        `/api/admin/support-quotes/${encodeURIComponent(quote.id)}/pdf?locale=${sendLocale}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `support-proposal-${quote.id}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-ns-primary/25 bg-ns-brand-light/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-bold text-ns-tertiary">{t("title")}</h4>
          <p className="mt-1 text-xs text-ns-secondary">{t("hint")}</p>
        </div>
        {quote.proposalSentAt ? (
          <p className="text-xs font-medium text-emerald-800">
            {t("sentAt", {
              date: new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(quote.proposalSentAt)),
            })}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {LOCALES.map((locale) => (
          <button
            key={locale}
            type="button"
            onClick={() => setActiveLocale(locale)}
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
              activeLocale === locale
                ? "bg-ns-tertiary text-white"
                : "border border-ns-border bg-white text-ns-secondary"
            }`}
          >
            {t(`locales.${locale}`)}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ns-tertiary">{t("fields.subject")}</span>
          <input
            className={INPUT_CLASS}
            value={content.subject}
            onChange={(e) => updateLocale("subject", e.target.value)}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ns-tertiary">{t("fields.rhythm")}</span>
            <input
              className={INPUT_CLASS}
              value={content.rhythmLine}
              onChange={(e) => updateLocale("rhythmLine", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ns-tertiary">{t("fields.amount")}</span>
            <input
              className={INPUT_CLASS}
              value={content.amountLine}
              onChange={(e) => updateLocale("amountLine", e.target.value)}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ns-tertiary">{t("fields.body")}</span>
          <textarea
            className={`${INPUT_CLASS} font-mono text-xs leading-relaxed`}
            rows={14}
            value={content.body}
            onChange={(e) => updateLocale("body", e.target.value)}
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3 border-t border-ns-border/60 pt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-ns-primary">
          {t("emailPreview")}
        </p>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ns-tertiary">{t("fields.subject")}</span>
          <input
            className={INPUT_CLASS}
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ns-tertiary">{t("fields.body")}</span>
          <textarea
            className={`${INPUT_CLASS} font-mono text-xs leading-relaxed`}
            rows={10}
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ns-tertiary">{t("sendLocale")}</span>
          <select
            className={INPUT_CLASS}
            value={sendLocale}
            onChange={(e) => setSendLocale(e.target.value as QuoteContentLocale)}
          >
            {LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {t(`locales.${locale}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={BTN_SECONDARY}
          disabled={pending}
          onClick={() => onPatch("regenerate_proposal")}
        >
          {t("actions.regenerate")}
        </button>
        <button
          type="button"
          className={BTN_PRIMARY}
          disabled={pending}
          onClick={() => onPatch("save_proposal", { proposalDraft: draft })}
        >
          {pending ? t("saving") : t("actions.save")}
        </button>
        <button
          type="button"
          className={BTN_SECONDARY}
          disabled={pending || pdfPending}
          onClick={() => void onDownloadPdf()}
        >
          {pdfPending ? t("downloadingPdf") : t("actions.downloadPdf")}
        </button>
        <button
          type="button"
          className={BTN_PRIMARY}
          disabled={pending}
          onClick={() =>
            onPatch("send_proposal", {
              proposalDraft: draft,
              sendLocale,
              emailSubject,
              emailBody,
            })
          }
        >
          {t("actions.send")}
        </button>
      </div>
    </div>
  );
}
