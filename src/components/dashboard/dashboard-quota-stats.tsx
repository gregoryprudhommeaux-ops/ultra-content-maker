"use client";

import { useSubscription } from "@/contexts/subscription-context";
import { CARD_SOFT, META_LABEL } from "@/lib/ui/nextstep";
import { useLocale, useTranslations } from "next-intl";

type Props = {
  validatedCount: number;
  pendingCount: number;
  lastValidatedAt: Date | null;
};

function formatDate(date: Date | null, locale: string): string {
  if (!date) return "—";
  const tag = locale === "en" ? "en-US" : locale === "es" ? "es-MX" : "fr-FR";
  return new Intl.DateTimeFormat(tag, { dateStyle: "medium" }).format(date);
}

export function DashboardQuotaStats({
  validatedCount,
  pendingCount,
  lastValidatedAt,
}: Props) {
  const t = useTranslations("dashboard.stats");
  const locale = useLocale();
  const { access, loading } = useSubscription();

  const postsRemaining = access?.postsRemaining;
  const remainingLabel =
    postsRemaining === null || postsRemaining === undefined
      ? postsRemaining === null
        ? t("remainingUnlimited")
        : "—"
      : t("remainingCount", { count: postsRemaining });

  const tierLabel = access
    ? t(`tier.${access.effectiveTier}` as Parameters<typeof t>[0])
    : "—";

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className={`${CARD_SOFT} p-4`}>
        <p className={META_LABEL}>{t("validated")}</p>
        <p className="mt-1 text-2xl font-bold text-ns-tertiary">{validatedCount}</p>
        <p className="mt-1 text-xs text-ns-secondary">
          {t("lastValidated", { date: formatDate(lastValidatedAt, locale) })}
        </p>
      </div>
      <div className={`${CARD_SOFT} p-4`}>
        <p className={META_LABEL}>{t("pending")}</p>
        <p className="mt-1 text-2xl font-bold text-amber-800">{pendingCount}</p>
        <p className="mt-1 text-xs text-ns-secondary">{t("pendingHint")}</p>
      </div>
      <div className={`${CARD_SOFT} p-4`}>
        <p className={META_LABEL}>{t("quota")}</p>
        <p className="mt-1 text-2xl font-bold text-ns-primary">
          {loading ? "…" : remainingLabel}
        </p>
        <p className="mt-1 text-xs text-ns-secondary">{t("quotaHint")}</p>
      </div>
      <div className={`${CARD_SOFT} p-4`}>
        <p className={META_LABEL}>{t("plan")}</p>
        <p className="mt-1 text-lg font-bold text-ns-tertiary">{loading ? "…" : tierLabel}</p>
        <p className="mt-1 text-xs text-ns-secondary">{t("planHint")}</p>
      </div>
    </div>
  );
}
