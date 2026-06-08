"use client";

import { useEffect } from "react";

type Props = {
  show: boolean;
  message: string;
  onDismiss?: () => void;
  durationMs?: number;
};

export function SaveFeedbackOverlay({
  show,
  message,
  onDismiss,
  durationMs = 2600,
}: Props) {
  useEffect(() => {
    if (!show) return;
    const timer = window.setTimeout(() => onDismiss?.(), durationMs);
    return () => window.clearTimeout(timer);
  }, [show, durationMs, onDismiss]);

  if (!show) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-start sm:justify-end sm:p-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex max-w-sm items-center gap-2 rounded-xl border border-ns-primary/30 bg-ns-tertiary px-4 py-3 text-sm font-medium text-white shadow-lg">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ns-primary text-xs font-bold text-ns-tertiary"
          aria-hidden
        >
          ✓
        </span>
        <span>{message}</span>
      </div>
    </div>
  );
}
