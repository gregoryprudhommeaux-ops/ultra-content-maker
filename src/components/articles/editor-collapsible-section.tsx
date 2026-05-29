"use client";

import type { ReactNode, RefObject, SyntheticEvent } from "react";
import { useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  hint?: string;
  badge?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Defer mounting children until the section is opened once (lighter first paint). */
  lazyMount?: boolean;
  /** Runs once when the section is opened for the first time (data prefetch, etc.). */
  onFirstOpen?: () => void;
  sectionRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
};

export function EditorCollapsibleSection({
  title,
  hint,
  badge,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  lazyMount = false,
  onFirstOpen,
  sectionRef,
  children,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;
  const firstOpenDoneRef = useRef(false);
  const [contentMounted, setContentMounted] = useState(
    !lazyMount || defaultOpen || (controlledOpen ?? false),
  );

  useEffect(() => {
    if (!isOpen) return;
    if (lazyMount && !contentMounted) {
      setContentMounted(true);
    }
    if (!firstOpenDoneRef.current) {
      firstOpenDoneRef.current = true;
      onFirstOpen?.();
    }
  }, [isOpen, lazyMount, contentMounted, onFirstOpen]);

  function handleToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    const next = event.currentTarget.open;
    if (!isControlled) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  }

  return (
    <div ref={sectionRef} className="scroll-mt-6">
      <details
        open={isOpen}
        onToggle={handleToggle}
        className="group rounded-xl border border-gray-100 bg-white"
      >
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold text-ns-tertiary">{title}</span>
              {badge ? (
                <span className="rounded-full bg-ns-brand-light px-2 py-0.5 text-xs font-medium text-ns-secondary">
                  {badge}
                </span>
              ) : null}
            </div>
            {hint ? (
              <p className="mt-0.5 text-sm leading-relaxed text-ns-secondary">{hint}</p>
            ) : null}
          </div>
          <span
            className="mt-1 shrink-0 text-xs text-ns-secondary transition-transform group-open:rotate-180"
            aria-hidden
          >
            ▼
          </span>
        </summary>
        <div className="space-y-4 border-t border-gray-100 px-4 py-4">
          {!lazyMount || contentMounted ? children : null}
        </div>
      </details>
    </div>
  );
}
