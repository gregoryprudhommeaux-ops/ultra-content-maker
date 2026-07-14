"use client";

import { useSubscription } from "@/contexts/subscription-context";
import { useUpgradeModal } from "@/contexts/upgrade-modal-context";
import { Link } from "@/i18n/navigation";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { useTranslations } from "next-intl";

export function SubscriptionBanner() {
  const { access, loading } = useSubscription();
  const { openUpgradeModal } = useUpgradeModal();
  const t = useTranslations("subscription.banner");

  if (loading || !access) return null;

  if (access.isTrialActive) {
    return (
      <div className="border-b border-ns-primary/25 bg-ns-primary/10 px-4 py-2.5 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 text-center text-sm text-ns-tertiary">
          <span className="font-medium">{t("trialShort", { posts: access.trialPostsRemaining })}</span>
          <button
            type="button"
            onClick={() => openUpgradeModal({ reason: "generic", plan: "pro_plus" })}
            className={`${BTN_PRIMARY} !px-4 !py-1.5 text-xs`}
          >
            {t("upgradeCta")}
          </button>
        </div>
      </div>
    );
  }

  const remaining = access.postsRemaining;
  const low =
    remaining !== null &&
    remaining <= 3 &&
    (access.effectiveTier === "pro" || access.effectiveTier === "pro_plus");

  if (low) {
    return (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-950 md:px-6">
        <span>
          {access.effectiveTier === "pro"
            ? t("proLow", { remaining })
            : t("proPlusLow", { remaining })}
        </span>
        {access.effectiveTier === "pro_plus" && (
          <>
            {" · "}
            <Link href="/setup/llm" className="font-semibold underline-offset-2 hover:underline">
              {t("addKey")}
            </Link>
          </>
        )}
        {" · "}
        <button
          type="button"
          onClick={() =>
            openUpgradeModal({
              reason: access.effectiveTier === "pro" ? "pro_cap" : "pro_plus_cap",
              plan: "pro_plus",
            })
          }
          className="font-semibold underline-offset-2 hover:underline"
        >
          {t("upgradeCta")}
        </button>
      </div>
    );
  }

  return null;
}
