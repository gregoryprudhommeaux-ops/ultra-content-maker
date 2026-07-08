"use client";

import { BTN_SECONDARY, FORM_SECTION_TITLE } from "@/lib/ui/nextstep";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

type CardProps = {
  title: string;
  hint?: string;
  onBack: () => void;
  children: ReactNode;
};

export function WizardStepCard({ title, hint, onBack, children }: CardProps) {
  const t = useTranslations("setup.articles.create");

  return (
    <section className="space-y-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3 border-b border-ns-alternate/40 pb-4">
        <div className="min-w-0 flex-1">
          <h2 className={FORM_SECTION_TITLE}>{title}</h2>
          {hint ? <p className="mt-1 text-sm text-ns-secondary">{hint}</p> : null}
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex shrink-0 items-center rounded-lg border border-ns-alternate bg-white px-3 py-1.5 text-sm font-medium text-ns-secondary hover:bg-ns-brand-light/50"
        >
          {t("backShort")}
        </button>
      </div>
      {children}
    </section>
  );
}

type ActionsProps = {
  onBack: () => void;
  children: ReactNode;
};

export function WizardStepActions({ onBack, children }: ActionsProps) {
  const t = useTranslations("setup.articles.create");

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-ns-alternate/40 pt-4">
      <button type="button" onClick={onBack} className={BTN_SECONDARY}>
        {t("backShort")}
      </button>
      {children}
    </div>
  );
}
