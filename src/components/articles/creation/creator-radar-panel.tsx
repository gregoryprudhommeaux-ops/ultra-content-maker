"use client";

import type { ReactNode } from "react";
import type { CreatorRadarSuggestion } from "@/types/creator-radar";
import type { CreatorRadarErrorDisplay } from "@/lib/creator-radar/radar-error-message";
import { buildLinkedInPeopleSearchUrl } from "@/lib/linkedin/people-search-url";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui/nextstep";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const FUNNEL_CLASS: Record<CreatorRadarSuggestion["funnelStage"], string> = {
  awareness: "bg-sky-100 text-sky-900",
  consideration: "bg-violet-100 text-violet-900",
  conversion: "bg-emerald-100 text-emerald-900",
};

function LinkedInPeopleSearchLink({
  name,
  headline,
  className,
  title,
  children,
}: {
  name: string;
  headline?: string;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={buildLinkedInPeopleSearchUrl(name, headline)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={title}
    >
      {children}
    </a>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
    </svg>
  );
}

type Props = {
  creators: CreatorRadarSuggestion[];
  loading?: boolean;
  error?: CreatorRadarErrorDisplay | null;
  empty?: CreatorRadarErrorDisplay | null;
  keepingId?: string | null;
  onKeep: (creator: CreatorRadarSuggestion) => void;
  onInspire: (creator: CreatorRadarSuggestion) => void;
  onDismiss: (creator: CreatorRadarSuggestion) => void;
  onRetry?: () => void;
};

function GuidancePanel({
  eyebrow,
  title,
  body,
  tips,
  actions,
  onRetry,
  retryLabel,
  variant = "amber",
}: {
  eyebrow: string;
  title: string;
  body: string;
  tips: string[];
  actions: CreatorRadarErrorDisplay["actions"];
  onRetry?: () => void;
  retryLabel?: string;
  variant?: "amber" | "muted";
}) {
  const border =
    variant === "amber" ? "border-amber-200/80 bg-amber-50/50" : "border-dashed border-ns-alternate bg-ns-brand-light/30";

  return (
    <section className={`rounded-xl border p-4 md:p-5 ${border}`}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-ns-primary">{eyebrow}</p>
      <h2 className="mt-1 text-base font-semibold text-ns-tertiary">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ns-secondary">{body}</p>
      {tips.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm text-ns-secondary">
          {tips.map((tip) => (
            <li key={tip} className="flex gap-2">
              <span className="text-ns-primary" aria-hidden>
                →
              </span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      )}
      {(actions.length > 0 || onRetry) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`${BTN_SECONDARY} !px-3 !py-1.5 !text-xs`}
            >
              {action.label}
            </Link>
          ))}
          {onRetry && retryLabel && (
            <button
              type="button"
              onClick={onRetry}
              className={`${BTN_SECONDARY} !px-3 !py-1.5 !text-xs`}
            >
              {retryLabel}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export function CreatorRadarPanel({
  creators,
  loading,
  error,
  empty,
  keepingId,
  onKeep,
  onInspire,
  onDismiss,
  onRetry,
}: Props) {
  const t = useTranslations("setup.articles.creatorRadar");

  if (loading) {
    return (
      <section className="rounded-xl border border-ns-primary/20 bg-gradient-to-br from-ns-brand-light/60 via-white to-white p-4 md:p-5">
        <p className="text-sm text-ns-secondary">{t("loading")}</p>
      </section>
    );
  }

  if (error) {
    return (
      <GuidancePanel
        eyebrow={t("eyebrow")}
        title={error.title}
        body={error.body}
        tips={error.tips}
        actions={error.actions}
        onRetry={error.showRetry ? onRetry : undefined}
        retryLabel={t("retry")}
        variant="amber"
      />
    );
  }

  if (empty) {
    return (
      <GuidancePanel
        eyebrow={t("eyebrow")}
        title={empty.title}
        body={empty.body}
        tips={empty.tips}
        actions={empty.actions}
        onRetry={empty.showRetry ? onRetry : undefined}
        retryLabel={t("retry")}
        variant="muted"
      />
    );
  }

  if (creators.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-ns-primary/25 bg-gradient-to-br from-ns-brand-light/80 via-white to-white p-4 md:p-5 space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-ns-primary">
          {t("eyebrow")}
        </p>
        <h2 className="mt-1 text-base font-semibold text-ns-tertiary text-balance">{t("title")}</h2>
        <p className="mt-1 text-sm text-ns-secondary text-pretty">{t("subtitle")}</p>
      </div>

      <ul className="space-y-3">
        {creators.map((creator) => (
          <li
            key={creator.id}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <LinkedInPeopleSearchLink
                name={creator.name}
                headline={creator.headline}
                title={t("viewProfileHint")}
                className="group min-w-0 flex-1 rounded-lg -m-1 p-1 transition hover:bg-ns-brand-light/40"
              >
                <span className="flex items-start gap-1.5">
                  <span className="font-semibold text-ns-tertiary underline decoration-ns-primary/50 underline-offset-2 group-hover:decoration-ns-primary">
                    {creator.name}
                  </span>
                  <ExternalLinkIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ns-primary opacity-70 group-hover:opacity-100" />
                </span>
                <p className="mt-0.5 text-xs text-ns-secondary line-clamp-2 group-hover:text-ns-tertiary/90">
                  {creator.headline}
                </p>
              </LinkedInPeopleSearchLink>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${FUNNEL_CLASS[creator.funnelStage]}`}
              >
                {t(`funnel.${creator.funnelStage}`)}
              </span>
            </div>
            <p className="mt-2 text-sm text-ns-secondary text-pretty">
              <span className="font-medium text-ns-tertiary">{t("whyLabel")}</span>{" "}
              {creator.whyRelevant}
            </p>
            <p className="mt-1.5 text-xs text-ns-secondary text-pretty">
              <span className="font-medium text-ns-tertiary">{t("angleLabel")}</span>{" "}
              {creator.lastPostAngle}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <LinkedInPeopleSearchLink
                name={creator.name}
                headline={creator.headline}
                title={t("viewProfileHint")}
                className={`${BTN_SECONDARY} inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-xs`}
              >
                {t("viewProfile")}
                <ExternalLinkIcon className="h-3.5 w-3.5" />
              </LinkedInPeopleSearchLink>
              <button
                type="button"
                disabled={keepingId === creator.id}
                onClick={() => onKeep(creator)}
                className={`${BTN_SECONDARY} !px-3 !py-1.5 !text-xs disabled:opacity-50`}
              >
                {keepingId === creator.id ? t("keeping") : t("keep")}
              </button>
              <button
                type="button"
                onClick={() => onInspire(creator)}
                className={`${BTN_PRIMARY} !px-3 !py-1.5 !text-xs`}
              >
                {t("inspire")}
              </button>
              <button
                type="button"
                onClick={() => onDismiss(creator)}
                className="rounded-lg border border-gray-100 px-3 py-1.5 text-xs font-semibold text-ns-secondary hover:border-rose-200 hover:text-rose-800"
              >
                {t("dismiss")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
