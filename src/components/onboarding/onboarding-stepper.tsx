"use client";

import { useOnboardingProgress } from "@/contexts/onboarding-progress-context";
import { isOnboardingBootstrapping } from "@/lib/workspace/onboarding-shell";
import type { StepVisualStatus } from "@/lib/workspace/onboarding-progress";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

function StepIndicator({ status }: { status: StepVisualStatus }) {
 if (status === "complete") {
 return (
 <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ns-primary text-xs font-bold text-black">
 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
 <path
 d="M5 12l5 5L19 7"
 stroke="currentColor"
 strokeWidth="2.5"
 strokeLinecap="round"
 strokeLinejoin="round"
 />
 </svg>
 </span>
 );
 }
 if (status === "current") {
 return (
 <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ns-primary bg-ns-hero ring-2 ring-ns-primary/30">
 <span className="h-2.5 w-2.5 rounded-full bg-ns-primary" aria-hidden />
 </span>
 );
 }
 return (
 <span
 className={`flex h-8 w-8 items-center justify-center rounded-full border ${
 status === "available"
 ? "border-ns-alternate bg-ns-surface"
 : "border-ns-alternate/60 bg-ns-brand-light"
 }`}
 >
 <span
 className={`h-2 w-2 rounded-full ${
 status === "available" ? "bg-ns-secondary/40" : "bg-ns-secondary/20"
 }`}
 aria-hidden
 />
 </span>
 );
}

function ChevronIcon({ open }: { open: boolean }) {
 return (
 <svg
 width="18"
 height="18"
 viewBox="0 0 24 24"
 fill="none"
 className={`shrink-0 text-ns-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
 aria-hidden
 >
 <path
 d="M6 9l6 6 6-6"
 stroke="currentColor"
 strokeWidth="2"
 strokeLinecap="round"
 strokeLinejoin="round"
 />
 </svg>
 );
}

type Placement = "dashboard" | "settings";

type Props = {
 /** dashboard: hidden at 100 %. settings: compact block on Réglages only. */
 placement?: Placement;
};

export function OnboardingStepper({ placement = "dashboard" }: Props) {
 const t = useTranslations("setup.onboarding");
 const tSteps = useTranslations("setup.steps");
 const { progress, loading } = useOnboardingProgress();
 const bootstrapping = isOnboardingBootstrapping(loading, progress);
 const pathname = usePathname();
 const isSettings = placement === "settings";
 const hiddenOnStart = placement === "dashboard" && pathname?.startsWith("/start");
 const hiddenOnAdmin = placement === "dashboard" && pathname?.includes("/admin");

 const [expanded, setExpanded] = useState(!isSettings);
 const prevCompleteRef = useRef<boolean | null>(null);

 const isComplete =
 progress != null && progress.completedCount >= progress.steps.length;

 useEffect(() => {
 if (progress == null) return;
 const complete = progress.completedCount >= progress.steps.length;
 if (prevCompleteRef.current === complete) return;
 prevCompleteRef.current = complete;
 setExpanded(isSettings ? false : !complete);
 }, [progress?.completedCount, progress?.steps.length, isSettings]);

 if (hiddenOnStart || hiddenOnAdmin) {
 return null;
 }

 if (!isSettings && isComplete) {
 return null;
 }

 if (bootstrapping || !progress) {
 if (isSettings) return null;
 return (
 <div
 className="mb-4 h-16 animate-pulse rounded-xl border border-gray-100/80 bg-ns-brand-light/60"
 aria-hidden
 />
 );
 }

 const stepsSummary = t("stepsCompleted", {
 done: progress.completedCount,
 total: progress.steps.length,
 });

 if (isSettings) {
 return (
 <div className="mb-6 rounded-lg border border-gray-100/90 bg-ns-brand-light/50">
 <button
 type="button"
 className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-ns-brand-light/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-primary/60"
 aria-expanded={expanded}
 aria-controls="onboarding-settings-panel"
 onClick={() => setExpanded((o) => !o)}
 >
 <div className="min-w-0 flex-1">
 <p className="text-xs font-medium text-ns-secondary">
 {t("settingsSectionTitle")}
 </p>
 <p className="text-sm font-semibold text-ns-tertiary">
 {isComplete
 ? t("completeSummary")
 : t("progressLabel", { percent: progress.percent })}
 </p>
 <p className="text-xs text-ns-secondary">{stepsSummary}</p>
 <div
 className="mt-2 h-1 overflow-hidden rounded-full bg-ns-brand-light"
 role="progressbar"
 aria-valuenow={progress.percent}
 aria-valuemin={0}
 aria-valuemax={100}
 >
 <div
 className="h-full rounded-full bg-ns-primary/90"
 style={{ width: `${progress.percent}%` }}
 />
 </div>
 </div>
 <ChevronIcon open={expanded} />
 </button>
 <div
 id="onboarding-settings-panel"
 className={`grid transition-[grid-template-rows] duration-200 ease-out ${
 expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
 }`}
 >
 <div className="overflow-hidden">
 <ol className="flex flex-wrap gap-2 border-t border-gray-100/80 px-3 py-2">
 {progress.steps.map((step, i) => {
 const label = tSteps(step.key);
 const canNavigate =
 step.status === "complete" ||
 step.status === "current" ||
 step.status === "available";
 const chip = (
 <span
 className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
 step.status === "complete"
 ? "bg-ns-primary/20 text-ns-tertiary"
 : step.status === "current"
 ? "border border-ns-primary/50 bg-white text-ns-tertiary"
 : "bg-white/80 text-ns-secondary"
 }`}
 >
 {label}
 </span>
 );
 return canNavigate ? (
 <li key={step.key}>
 <Link href={step.href}>{chip}</Link>
 </li>
 ) : (
 <li key={step.key} className="opacity-50">
 {chip}
 </li>
 );
 })}
 </ol>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="mb-4 rounded-xl border border-gray-100/90 bg-ns-surface/80 shadow-sm">
 <button
 type="button"
 className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-ns-brand-light/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-primary/80 md:px-4 md:py-3"
 aria-expanded={expanded}
 aria-controls="onboarding-stepper-panel"
 onClick={() => setExpanded((o) => !o)}
 >
 <div className="min-w-0 flex-1">
 <p className="text-sm font-semibold text-ns-tertiary">
 {isComplete ? t("completeSummary") : t("progressLabel", { percent: progress.percent })}
 </p>
 <p className="mt-0.5 text-xs font-medium text-ns-secondary">{stepsSummary}</p>
 {!isComplete && progress.nextStep && progress.nextHref && (
 <p className="mt-1.5 text-xs font-semibold text-ns-primary">
 <Link href={progress.nextHref} className="hover:underline">
 {t("continueNext", { step: tSteps(progress.nextStep) })}
 </Link>
 </p>
 )}
 {!expanded && (
 <div
 className="mt-2 h-1.5 overflow-hidden rounded-full bg-ns-brand-light"
 role="progressbar"
 aria-valuenow={progress.percent}
 aria-valuemin={0}
 aria-valuemax={100}
 aria-label={t("progressLabel", { percent: progress.percent })}
 >
 <div
 className="h-full rounded-full bg-ns-primary"
 style={{ width: `${progress.percent}%` }}
 />
 </div>
 )}
 </div>
 <ChevronIcon open={expanded} />
 <span className="sr-only">
 {expanded ? t("collapseSteps") : t("expandSteps")}
 </span>
 </button>

 <div
 id="onboarding-stepper-panel"
 className={`grid transition-[grid-template-rows] duration-200 ease-out ${
 expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
 }`}
 >
 <div className="overflow-hidden">
 <div className="space-y-4 border-t border-gray-100 px-4 pb-4 pt-3 md:px-5 md:pb-5">
 <div
 className="h-2 overflow-hidden rounded-full bg-ns-brand-light"
 role="progressbar"
 aria-valuenow={progress.percent}
 aria-valuemin={0}
 aria-valuemax={100}
 aria-label={t("progressLabel", { percent: progress.percent })}
 >
 <div
 className="h-full rounded-full bg-ns-primary transition-all duration-500"
 style={{ width: `${progress.percent}%` }}
 />
 </div>

 <ol className="flex gap-1 overflow-x-auto pb-1 md:grid md:grid-cols-5 md:gap-2 md:overflow-visible">
 {progress.steps.map((step, i) => {
 const index = i + 1;
 const label = tSteps(step.key);
 const canNavigate = step.status === "complete" || step.status === "current" || step.status === "available";
 const stepLabel = `${label}${
 step.status === "complete" ? ` · ${t("status.complete")}` : ""
 }`;

 const content = (
 <>
 <StepIndicator status={step.status} />
 <span
 className={`mt-2 line-clamp-2 text-center text-[10px] font-bold leading-tight md:text-[11px] ${
 step.status === "current"
 ? "text-ns-tertiary"
 : step.status === "complete"
 ? "text-ns-secondary"
 : step.status === "available"
 ? "text-ns-secondary"
 : "text-ns-secondary/40"
 }`}
 >
 {label}
 </span>
 </>
 );

 return (
 <li key={step.key} className="flex min-w-[4.5rem] flex-1 flex-col items-center md:min-w-0">
 {i > 0 && (
 <span
 className="absolute hidden md:block"
 aria-hidden
 />
 )}
 {canNavigate ? (
 <Link
 href={step.href}
 className="flex w-full flex-col items-center rounded-lg px-1 py-2 transition-colors hover:bg-ns-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-primary/80"
 aria-current={step.status === "current" ? "step" : undefined}
 aria-label={stepLabel}
 >
 {content}
 </Link>
 ) : (
 <div
 className="flex w-full flex-col items-center px-1 py-2 opacity-60"
 aria-disabled
 title={t("status.locked")}
 >
 {content}
 </div>
 )}
 </li>
 );
 })}
 </ol>
 </div>
 </div>
 </div>
 </div>
 );
}
