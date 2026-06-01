"use client";

import { CARD_SOFT, META_LABEL } from "@/lib/ui/nextstep";
import { KeyRound, Lock, ShieldCheck, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";

const TRUST_ICONS = [KeyRound, Lock, ShieldCheck, UserCheck] as const;

export function LlmTrustPanel() {
  const t = useTranslations("setup.llm.trust");
  const bullets = t.raw("bullets") as string[];

  return (
    <aside
      className={`${CARD_SOFT} border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 via-white to-white`}
      aria-labelledby="llm-trust-title"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ns-primary/15 text-ns-tertiary"
          aria-hidden
        >
          <ShieldCheck className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p id="llm-trust-title" className={META_LABEL}>
            {t("eyebrow")}
          </p>
          <h2 className="mt-1 text-base font-bold text-ns-tertiary">{t("title")}</h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-ns-secondary">
            {t("summary")}
          </p>
        </div>
      </div>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {bullets.map((text, i) => {
          const Icon = TRUST_ICONS[i] ?? ShieldCheck;
          return (
            <li
              key={text}
              className="flex gap-3 rounded-xl border border-gray-100/90 bg-white/90 px-3 py-3"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ns-primary" aria-hidden />
              <span className="text-sm font-medium leading-snug text-ns-tertiary">{text}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 border-t border-emerald-100 pt-3 text-xs font-medium leading-relaxed text-amber-900/90">
        {t("privacyReminder")}
      </p>
    </aside>
  );
}
