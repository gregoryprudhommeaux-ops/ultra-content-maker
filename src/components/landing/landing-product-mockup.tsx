"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

const POST_KEYS = ["post1", "post2", "post3", "post4"] as const;
const SCOPES = ["generalist", "generalist", "niche", "niche"] as const;

export function LandingProductMockup() {
  const t = useTranslations("landing.product");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5" role="group" aria-label={t("mockupAria")}>
      <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:gap-2">
        <Panel label={t("panels.brief.label")} step="1" className="lg:flex-1">
          <div className="flex min-h-[200px] flex-col justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(["credibility", "conversation"] as const).map((obj) => (
                <span
                  key={obj}
                  className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    obj === "credibility"
                      ? "bg-ns-primary/25 text-ns-tertiary ring-1 ring-ns-primary/40"
                      : "bg-gray-100 text-ns-secondary"
                  }`}
                >
                  {t(`panels.brief.objectives.${obj}`)}
                </span>
              ))}
            </div>
            <div className="space-y-2">
              <BriefField label={t("panels.brief.fields.problem")} value={t("panels.brief.sampleProblem")} />
              <BriefField label={t("panels.brief.fields.pov")} value={t("panels.brief.samplePov")} />
            </div>
            <span className="inline-flex w-fit rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
              {t("panels.brief.nicheOk")}
            </span>
          </div>
        </Panel>

        <FlowArrow />

        <Panel label={t("panels.exploration.label")} step="2" className="lg:flex-[1.15]">
          <div className="grid min-h-[200px] grid-cols-2 gap-2 content-stretch">
            {POST_KEYS.map((key, i) => {
              const scope = SCOPES[i];
              const border =
                scope === "generalist" ? "border-l-ns-primary" : "border-l-ns-secondary";
              return (
                <div
                  key={key}
                  className={`flex min-h-[88px] flex-col rounded-lg border border-gray-100 border-l-[3px] bg-ns-brand-light p-2.5 ${border}`}
                >
                  <span className="text-[9px] font-bold uppercase tracking-wide text-ns-secondary">
                    {t(`scope.${scope}`)}
                  </span>
                  <p className="mt-auto text-[11px] font-medium leading-snug text-ns-tertiary line-clamp-3">
                    {t(`posts.${key}`)}
                  </p>
                </div>
              );
            })}
          </div>
        </Panel>

        <FlowArrow />

        <Panel label={t("panels.refine.label")} step="3" className="lg:flex-1">
          <div className="flex min-h-[200px] flex-col justify-between gap-3">
            <ul className="space-y-2.5">
              {(["nicheClarity", "proofDensity", "conversationPotential"] as const).map(
                (score) => (
                  <li key={score}>
                    <div className="flex justify-between text-[10px] font-medium text-ns-secondary">
                      <span>{t(`panels.refine.scores.${score}`)}</span>
                      <span className="font-bold text-ns-tertiary">8/10</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full w-[80%] rounded-full bg-ns-primary" />
                    </div>
                  </li>
                ),
              )}
            </ul>
            <p className="rounded-md bg-amber-50 px-2 py-1.5 text-[10px] font-medium leading-snug text-amber-900">
              {t("panels.refine.slopHint")}
            </p>
          </div>
        </Panel>
      </div>

      <p className="text-center text-[11px] font-medium text-ns-secondary/80">{t("caption")}</p>
      <p className="sr-only">{t("mockupSummary")}</p>
    </div>
  );
}

function BriefField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-2.5 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-ns-secondary">{label}</p>
      <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-ns-tertiary/85">{value}</p>
    </div>
  );
}

function FlowArrow() {
  return (
    <div
      className="hidden shrink-0 items-center justify-center px-0.5 text-ns-secondary/35 lg:flex"
      aria-hidden
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Panel({
  label,
  step,
  className = "",
  children,
}: {
  label: string;
  step: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex h-full flex-col rounded-2xl border border-gray-100/80 bg-ns-surface p-4 shadow-md shadow-ns-tertiary/5 md:p-4 ${className}`}
    >
      <div className="mb-3 flex items-center gap-2.5 border-b border-gray-100 pb-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ns-primary/20 text-xs font-black text-ns-tertiary">
          {step}
        </span>
        <span className="text-[11px] font-bold uppercase leading-tight tracking-wide text-ns-tertiary">
          {label}
        </span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
