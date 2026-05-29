"use client";

import { ContextHelp } from "@/components/ui/context-help";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

type Props = {
  onDismiss: () => void;
};

/** First-time creators on /articles/new (without ?from=ready). */
export function BriefReminderBanner({ onDismiss }: Props) {
  const t = useTranslations("setup.articles.create.briefReminder");

  return (
    <div
      className="relative rounded-xl border border-sky-200/80 bg-sky-50/60 p-4 md:p-5"
      role="status"
    >
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-3 top-3 rounded-md p-1 text-ns-secondary hover:bg-white/60 hover:text-ns-tertiary"
        aria-label={t("dismiss")}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
      <div className="flex flex-wrap items-center gap-2 pr-8">
        <p className="text-sm font-semibold text-ns-tertiary">{t("title")}</p>
        <ContextHelp label={t("help.label")}>{t("help.body")}</ContextHelp>
      </div>
      <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-ns-secondary">
        {t("description")}
      </p>
      <ul className="mt-3 grid gap-2 text-xs font-medium text-ns-tertiary sm:grid-cols-3">
        <li className="rounded-lg border border-white/80 bg-white/70 px-3 py-2">
          {t("pillars.problem")}
        </li>
        <li className="rounded-lg border border-white/80 bg-white/70 px-3 py-2">
          {t("pillars.pov")}
        </li>
        <li className="rounded-lg border border-white/80 bg-white/70 px-3 py-2">
          {t("pillars.proof")}
        </li>
      </ul>
    </div>
  );
}
