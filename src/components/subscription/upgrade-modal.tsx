"use client";

import { useUpgradeModal, type UpgradeModalReason } from "@/contexts/upgrade-modal-context";
import { Link } from "@/i18n/navigation";
import {
  PRICING,
  SELF_SERVE_POSTS_PER_MONTH,
  TRIAL_DAYS,
  TRIAL_MAX_POSTS,
} from "@/lib/subscription/constants";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

function CheckIcon() {
  return (
    <span
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ns-primary text-[10px] font-black text-ns-hero"
      aria-hidden
    >
      ✓
    </span>
  );
}

function SparkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364-2.121 2.121M8.757 15.243l-2.121 2.121m12.728 0-2.121-2.121M8.757 8.757 6.636 6.636"
      />
      <circle cx="12" cy="12" r="3.25" />
    </svg>
  );
}

function reasonHeadlineKey(reason: UpgradeModalReason): string {
  switch (reason) {
    case "trial_posts_exhausted":
      return "reasons.trialPosts";
    case "trial_expired":
    case "subscription_expired":
      return "reasons.trialExpired";
    case "pro_cap":
      return "reasons.proCap";
    case "pro_plus_cap":
      return "reasons.proPlusCap";
    case "article_feedback_limit":
      return "reasons.feedbackLimit";
    case "premium_required":
      return "reasons.premiumRequired";
    case "wire_payment_overdue":
      return "reasons.wireOverdue";
    default:
      return "reasons.generic";
  }
}

const FEATURE_KEYS = ["f1", "f2", "f3", "f4", "f5", "f6", "f7"] as const;

export function UpgradeModal() {
  const { open, reason, plan, closeUpgradeModal } = useUpgradeModal();
  const t = useTranslations("subscription.upgradeModal");
  const tPricing = useTranslations("pricing");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeUpgradeModal();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, closeUpgradeModal]);

  if (!open) return null;

  const price =
    plan === "pro" ? PRICING.pro.usdMonthly : PRICING.proPlus.usdMonthly;
  const planName = plan === "pro" ? tPricing("pro.name") : tPricing("proPlus.name");
  const upgradeHref = `/upgrade?plan=${plan}`;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-ns-hero/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeUpgradeModal();
      }}
    >
      <div
        className="relative max-h-[min(100dvh,100%)] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-white/10 bg-[#0c0c0c] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-11 shadow-2xl sm:max-h-[min(90dvh,720px)] sm:rounded-2xl sm:px-6 sm:pb-7 sm:pt-12"
      >
        <button
          type="button"
          onClick={closeUpgradeModal}
          className="absolute right-2 top-2 z-10 rounded-lg p-2 text-white/50 transition hover:bg-white/10 hover:text-white sm:right-3 sm:top-3"
          aria-label={t("close")}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>

        <div className="absolute left-1/2 top-0 z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#161616] shadow-lg sm:h-12 sm:w-12">
          <SparkIcon />
        </div>

        <div className="text-center">
          <h2
            id="upgrade-modal-title"
            className="text-lg font-semibold leading-snug tracking-tight text-white sm:text-[1.35rem]"
          >
            {t(reasonHeadlineKey(reason))}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-white/55 sm:text-sm">
            {t.rich("subtitle", {
              strong: (chunks) => (
                <span className="font-semibold text-white/85">{chunks}</span>
              ),
              posts: SELF_SERVE_POSTS_PER_MONTH,
              trialPosts: TRIAL_MAX_POSTS,
              trialDays: TRIAL_DAYS,
            })}
          </p>
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:mt-6 sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-white/80">{planName}</p>
            {plan === "pro_plus" ? (
              <span className="shrink-0 rounded-full bg-ns-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ns-primary">
                {t("popular")}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[1.75rem] font-semibold tracking-tight text-white sm:text-3xl">
            ${price}
            <span className="ml-1 text-sm font-normal text-white/45">{t("perMonth")}</span>
          </p>

          <ul className="mt-4 space-y-2.5">
            {FEATURE_KEYS.map((key) => (
              <li key={key} className="flex items-start gap-2.5 text-[13px] text-white/75 sm:text-sm">
                <CheckIcon />
                <span>
                  {plan === "pro" ? tPricing(`pro.${key}`) : tPricing(`proPlus.${key}`)}
                </span>
              </li>
            ))}
          </ul>

          <Link
            href={upgradeHref}
            onClick={closeUpgradeModal}
            className="mt-5 flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-ns-hero transition hover:bg-white/90"
          >
            {t("upgradeNow")}
          </Link>
        </div>

        <p className="mt-5 text-center text-[13px] leading-snug text-white/45 sm:text-sm">
          {t("biggerPlan")}{" "}
          <Link
            href="/pricing"
            onClick={closeUpgradeModal}
            className="font-semibold text-white underline-offset-2 hover:underline"
          >
            {t("seeAllPlans")}
          </Link>
        </p>

        <p className="mt-3 text-center text-xs text-white/35">
          {plan === "pro_plus" ? (
            <Link
              href="/upgrade?plan=pro"
              onClick={closeUpgradeModal}
              className="underline-offset-2 hover:text-white/55 hover:underline"
            >
              {t("preferPro")}
            </Link>
          ) : (
            <Link
              href="/upgrade?plan=pro_plus"
              onClick={closeUpgradeModal}
              className="underline-offset-2 hover:text-white/55 hover:underline"
            >
              {t("preferProPlus")}
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}
