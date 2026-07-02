"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui/nextstep";
import type { TierQuizAnswer } from "@/types/subscription";

type Props = {
  onComplete?: (recommended: "pro" | "pro_plus") => void;
};

function ChoiceCard({
  title,
  description,
  onClick,
  primary,
}: {
  title: string;
  description: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
        primary
          ? "border-ns-primary/50 bg-ns-primary/10 ring-1 ring-ns-primary/25"
          : "border-ns-border bg-white hover:border-ns-primary/30"
      }`}
    >
      <span className="block text-base font-bold text-ns-tertiary">{title}</span>
      <span className="mt-1.5 block text-sm leading-relaxed text-ns-secondary">{description}</span>
    </button>
  );
}

export function UpgradeQuiz({ onComplete }: Props) {
  const t = useTranslations("subscription.quiz");
  const [step, setStep] = useState<0 | 1>(0);
  const [answer, setAnswer] = useState<TierQuizAnswer | null>(null);

  const recommended: "pro" | "pro_plus" =
    answer === "has_api_key" ? "pro" : "pro_plus";

  function finish(a: TierQuizAnswer) {
    if (a === "want_done_for_you") return;
    setAnswer(a);
    setStep(1);
    const rec = a === "has_api_key" ? "pro" : "pro_plus";
    onComplete?.(rec);
  }

  if (step === 1 && answer) {
    return (
      <div className="rounded-2xl border border-ns-primary/25 bg-gradient-to-b from-ns-primary/10 to-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-ns-primary">{t("resultLabel")}</p>
        <h2 className="mt-2 text-xl font-bold text-ns-tertiary">
          {recommended === "pro" ? t("resultProTitle") : t("resultProPlusTitle")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ns-secondary">
          {recommended === "pro" ? t("resultProBody") : t("resultProPlusBody")}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={recommended === "pro" ? "/upgrade?plan=pro" : "/upgrade?plan=pro_plus"}
            className={BTN_PRIMARY}
          >
            {t("continue")}
          </Link>
          <Link href="/pricing" className={BTN_SECONDARY}>
            {t("compare")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ns-border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-ns-tertiary">{t("title")}</h2>
      <p className="mt-2 text-sm text-ns-secondary">{t("subtitle")}</p>
      <div className="mt-6 flex flex-col gap-3">
        <ChoiceCard
          primary
          title={t("optSimpleTitle")}
          description={t("optSimple")}
          onClick={() => finish("no_api_key")}
        />
        <ChoiceCard
          title={t("optOwnKeyTitle")}
          description={t("optOwnKey")}
          onClick={() => finish("has_api_key")}
        />
      </div>
      <p className="mt-6 border-t border-ns-border pt-5 text-center text-sm text-ns-secondary">
        {t("optSupportLead")}{" "}
        <Link href="/support" className="font-semibold text-ns-primary underline-offset-2 hover:underline">
          {t("optSupport")}
        </Link>
      </p>
    </div>
  );
}
