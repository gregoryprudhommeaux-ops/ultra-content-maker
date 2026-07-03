"use client";

import type { SupportQuotePlan } from "@/lib/email/send-support-quote";
import { PRICING } from "@/lib/subscription/constants";
import { useTranslations } from "next-intl";

const PLAN_ORDER: SupportQuotePlan[] = ["starter", "regular", "much_more"];

type Props = {
  value: SupportQuotePlan;
  onChange: (plan: SupportQuotePlan) => void;
};

export function SupportPlanPicker({ value, onChange }: Props) {
  const t = useTranslations("subscription.support");

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ns-secondary">
        {t("planChooseLabel")}
      </p>
      <ul className="mt-3 space-y-3" role="radiogroup" aria-label={t("planChooseLabel")}>
        {PLAN_ORDER.map((plan) => {
          const selected = value === plan;
          return (
            <li key={plan}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(plan)}
                className={`w-full rounded-xl p-4 text-left text-sm transition-colors ${
                  selected
                    ? "border-2 border-ns-primary bg-ns-primary/10 shadow-sm"
                    : "border border-ns-border/80 bg-white hover:border-ns-primary/40"
                }`}
              >
                <p className="font-bold text-ns-tertiary">
                  {plan === "starter"
                    ? t("starterLabel")
                    : plan === "regular"
                      ? t("regularLabel")
                      : t("muchMoreLabel")}
                </p>
                {plan === "much_more" ? (
                  <p className="mt-1 text-ns-secondary">{t("muchMoreDetail")}</p>
                ) : plan === "starter" ? (
                  <p className="mt-1 text-ns-secondary">
                    ${PRICING.support.starter.usdMonthly}
                    {t("perMonth")} · {t("starterDetail", { posts: PRICING.support.starter.postsPerMonth })}
                  </p>
                ) : (
                  <p className="mt-1 text-ns-secondary">
                    ${PRICING.support.regular.usdMonthly}
                    {t("perMonth")} · {t("regularDetail")}
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
