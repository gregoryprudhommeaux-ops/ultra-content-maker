"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";

type Props = {
  onDismiss: () => void;
};

/** Shown on /articles/new when the user arrives from /start/ready after setup. */
export function SetupReadyBanner({ onDismiss }: Props) {
  const t = useTranslations("setup.articles.create.setupReadyBanner");

  return (
    <div
      className="relative rounded-xl border border-ns-primary/30 bg-ns-primary/10 p-4 md:p-5"
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
      <p className="pr-8 text-xs font-black uppercase tracking-widest text-ns-primary">
        {t("eyebrow")}
      </p>
      <h2 className="mt-1 text-base font-bold text-ns-tertiary">{t("title")}</h2>
      <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-ns-secondary">
        {t("description")}
      </p>
    </div>
  );
}
