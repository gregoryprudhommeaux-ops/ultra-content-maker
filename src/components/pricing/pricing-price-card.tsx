"use client";

import { PlanFeatureList } from "@/components/pricing/plan-feature-list";
import { formatUsdAmount } from "@/lib/subscription/format-usd-price";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui/nextstep";

export type PriceCardVariant = "default" | "highlighted" | "onDark";

type Props = {
  name: string;
  amountUsd: number;
  showPeriod?: boolean;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  onCtaClick?: () => void;
  highlighted?: boolean;
  badge?: string;
  locale: AppLocale;
  perMonthLabel: string;
  variant?: PriceCardVariant;
};

function UsdPriceBlock({
  amountUsd,
  showPeriod,
  locale,
  perMonthLabel,
  onDark,
}: {
  amountUsd: number;
  showPeriod: boolean;
  locale: AppLocale;
  perMonthLabel: string;
  onDark?: boolean;
}) {
  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span
          className={`text-3xl font-bold tabular-nums ${onDark ? "text-white" : "text-ns-tertiary"}`}
        >
          {formatUsdAmount(amountUsd, locale)}
        </span>
        {showPeriod ? (
          <span className={`text-sm ${onDark ? "text-white/70" : "text-ns-secondary"}`}>
            {perMonthLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function PricingPriceCard({
  name,
  amountUsd,
  showPeriod = true,
  description,
  features,
  cta,
  ctaHref,
  onCtaClick,
  highlighted,
  badge,
  locale,
  perMonthLabel,
  variant = "default",
}: Props) {
  const onDark = variant === "onDark";
  const isHighlighted = highlighted || variant === "highlighted";

  const shell = onDark
    ? "border-white/15 bg-white/5 ring-1 ring-white/10"
    : isHighlighted
      ? "border-ns-primary bg-white ring-2 ring-ns-primary/20"
      : "border-ns-border bg-white shadow-sm";

  const ctaClass = onDark
    ? `${BTN_PRIMARY} w-full`
    : isHighlighted
      ? `${BTN_PRIMARY} w-full`
      : `${BTN_SECONDARY} w-full`;

  return (
    <div className={`relative flex flex-col rounded-2xl border p-6 ${shell}`}>
      {badge ? (
        <span className="mb-3 inline-flex w-fit rounded-full bg-ns-primary px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-ns-hero">
          {badge}
        </span>
      ) : null}

      <h3 className={`text-lg font-bold ${onDark ? "text-white" : "text-ns-tertiary"}`}>{name}</h3>
      <p className={`mt-1 text-sm leading-snug text-pretty ${onDark ? "text-white/75" : "text-ns-secondary"}`}>
        {description}
      </p>

      <UsdPriceBlock
        amountUsd={amountUsd}
        showPeriod={showPeriod}
        locale={locale}
        perMonthLabel={perMonthLabel}
        onDark={onDark}
      />

      <div className="mt-5 flex-1">
        <PlanFeatureList features={features} variant={onDark ? "onDark" : "default"} />
      </div>

      <div className={`mt-6 border-t pt-5 ${onDark ? "border-white/15" : "border-ns-border/70"}`}>
        {onCtaClick ? (
          <button
            type="button"
            onClick={onCtaClick}
            className={`flex min-h-[3rem] items-center justify-center rounded-xl px-5 py-3 text-center text-sm font-bold leading-snug ${ctaClass}`}
          >
            {cta}
          </button>
        ) : (
          <Link
            href={ctaHref}
            className={`flex min-h-[3rem] items-center justify-center rounded-xl px-5 py-3 text-center text-sm font-bold leading-snug ${ctaClass}`}
          >
            {cta}
          </Link>
        )}
      </div>
    </div>
  );
}
