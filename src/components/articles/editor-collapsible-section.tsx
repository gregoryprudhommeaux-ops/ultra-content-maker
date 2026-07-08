"use client";

import { EditorBlockHeader } from "@/components/articles/editor-block-header";
import type { EditorSectionIconId } from "@/components/articles/editor-section-icon";
import type { ReactNode, RefObject, SyntheticEvent } from "react";
import { useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  hint?: string;
  eyebrow?: string;
  icon?: EditorSectionIconId;
  badge?: string;
  titleExtra?: ReactNode;
  actions?: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  lazyMount?: boolean;
  onFirstOpen?: () => void;
  sectionRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 text-ns-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function EditorCollapsibleSection({
  title,
  hint,
  eyebrow,
  icon,
  badge,
  titleExtra,
  actions,
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

  const headerActions = (
    <div
      className="flex items-center gap-2"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {actions}
      {badge ? (
        <span className="rounded-full bg-ns-brand-light px-2 py-0.5 text-xs font-medium text-ns-secondary">
          {badge}
        </span>
      ) : null}
      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-ns-alternate/60 bg-white">
        <ChevronIcon open={isOpen} />
      </span>
    </div>
  );

  return (
    <div ref={sectionRef} className="scroll-mt-6">
      <details
        open={isOpen}
        onToggle={handleToggle}
        className="group overflow-hidden rounded-xl border border-ns-alternate/70 bg-white shadow-sm"
      >
        <summary className="cursor-pointer list-none px-4 py-4 marker:content-none sm:px-5 [&::-webkit-details-marker]:hidden">
          <EditorBlockHeader
            title={title}
            hint={hint}
            eyebrow={eyebrow}
            icon={icon}
            titleExtra={titleExtra}
            actions={headerActions}
          />
        </summary>
        <div className="space-y-4 border-t border-ns-alternate/50 bg-ns-brand-light/20 px-4 py-4 sm:px-5 sm:py-5">
          {!lazyMount || contentMounted ? children : null}
        </div>
      </details>
    </div>
  );
}
