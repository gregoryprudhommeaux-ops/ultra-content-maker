"use client";

import { SupportQuoteForm } from "@/components/pricing/support-quote-form";
import type { SupportQuotePlan } from "@/lib/email/send-support-quote";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

type Props = {
  open: boolean;
  plan: SupportQuotePlan;
  onClose: () => void;
};

export function SupportQuoteDialog({ open, plan, onClose }: Props) {
  const t = useTranslations("pricing.support.quoteForm");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-ns-hero/70 backdrop-blur-sm"
        aria-label={t("close")}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-quote-title"
        className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-white p-6 shadow-2xl"
      >
        <h2 id="support-quote-title" className="text-lg font-bold text-ns-tertiary">
          {t("dialogTitle")}
        </h2>
        <p className="mt-1 text-sm text-ns-secondary">{t("dialogSubtitle")}</p>
        <div className="mt-5">
          <SupportQuoteForm plan={plan} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
