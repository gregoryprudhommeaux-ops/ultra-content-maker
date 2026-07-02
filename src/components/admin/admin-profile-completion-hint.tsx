"use client";

import type { AdminUserMetrics } from "@/lib/admin/analytics-types";
import { createPortal } from "react-dom";
import { useCallback, useRef, useState } from "react";

const STEP_KEYS = ["llm", "author", "audience", "persona", "firstArticle", "firstValidated"] as const;

type StepKey = (typeof STEP_KEYS)[number];

type Labels = {
  llm: string;
  author: string;
  audience: string;
  persona: string;
  firstArticle: string;
  firstValidated: string;
  complete: string;
  missingTitle: string;
  guideHint: string;
  hoverHint: string;
};

type Props = {
  user: AdminUserMetrics;
  labels: Labels;
  toneClass: string;
};

function completionTone(percent: number): string {
  if (percent >= 80) return "bg-emerald-100 text-emerald-900";
  if (percent >= 50) return "bg-amber-100 text-amber-950";
  return "bg-rose-100 text-rose-900";
}

export function AdminProfileCompletionHint({ user, labels, toneClass }: Props) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const missing = STEP_KEYS.filter((key) => !user.onboardingSteps[key]);
  const isComplete = missing.length === 0;

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = 260;
    const left = Math.min(rect.left, window.innerWidth - width - 12);
    setPosition({ top: rect.bottom + 8, left: Math.max(12, left) });
  }, []);

  function onOpen() {
    if (isComplete) return;
    updatePosition();
    setOpen(true);
  }

  function onClose() {
    setOpen(false);
  }

  const tooltip =
    open && !isComplete && typeof document !== "undefined"
      ? createPortal(
          <div
            role="tooltip"
            id={`profile-hint-${user.userId}`}
            style={{ top: position.top, left: position.left, width: 260 }}
            className="fixed z-[9999] rounded-xl border border-ns-alternate bg-white p-3 text-left text-xs shadow-xl"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={onClose}
          >
            <p className="font-bold text-ns-tertiary">{labels.missingTitle}</p>
            <ul className="mt-2 space-y-1.5">
              {STEP_KEYS.map((key) => (
                <li
                  key={key}
                  className={`flex items-start gap-2 ${
                    user.onboardingSteps[key] ? "text-emerald-800" : "text-rose-800"
                  }`}
                >
                  <span aria-hidden className="mt-0.5 shrink-0 font-bold">
                    {user.onboardingSteps[key] ? "✓" : "✗"}
                  </span>
                  <span>{labels[key]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-ns-alternate/60 pt-2 text-[11px] leading-snug text-ns-secondary">
              {labels.guideHint}
            </p>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={`group inline-flex flex-col items-start rounded-lg px-1 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-primary/50 ${
          isComplete ? "cursor-default" : "cursor-help"
        }`}
        aria-label={
          isComplete
            ? labels.complete
            : `${user.completionPercent}% · ${labels.hoverHint}`
        }
        aria-describedby={open ? `profile-hint-${user.userId}` : undefined}
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
        onFocus={onOpen}
        onBlur={onClose}
      >
        <span className="inline-flex items-center gap-1">
          <span
            className={`inline-flex min-w-[3rem] justify-center rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${toneClass}`}
          >
            {user.completionPercent}%
          </span>
          {!isComplete ? (
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-ns-brand-light text-[10px] font-bold text-ns-secondary"
              aria-hidden
            >
              i
            </span>
          ) : null}
        </span>
        <div className="mt-1.5 flex items-center gap-1" aria-hidden>
          {STEP_KEYS.map((key) => (
            <span
              key={key}
              className={`h-1.5 w-3 rounded-full ${
                user.onboardingSteps[key] ? "bg-emerald-500" : "bg-rose-300"
              }`}
            />
          ))}
        </div>
      </button>
      {tooltip}
    </>
  );
}

export type { Labels as ProfileCompletionHintLabels, StepKey };
