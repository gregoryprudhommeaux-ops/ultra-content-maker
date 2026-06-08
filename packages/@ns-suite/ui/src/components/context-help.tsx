"use client";

import { useId, useState, type ReactNode } from "react";

export type ContextHelpProps = {
  /** Accessible name for the help trigger. */
  label: string;
  children: ReactNode;
  className?: string;
};

/** Compact contextual help — opens on hover or keyboard focus, closes on leave/blur. */
export function ContextHelp({ label, children, className = "" }: ContextHelpProps) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`relative inline-block text-left ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="flex h-6 w-6 cursor-help items-center justify-center rounded-full border border-ns-alternate bg-white text-xs font-bold text-ns-secondary transition hover:border-ns-primary hover:text-ns-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ns-primary/40"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
      >
        ?
      </button>
      <div
        className={`absolute left-0 top-full z-20 pt-2 transition-opacity duration-150 ${
          open
            ? "pointer-events-auto visible opacity-100"
            : "pointer-events-none invisible opacity-0"
        }`}
        role="tooltip"
        id={tooltipId}
      >
        <div className="w-[min(100vw-2rem,22rem)] rounded-lg border border-gray-200 bg-white p-3 text-sm font-normal leading-relaxed text-ns-secondary shadow-lg">
          {children}
        </div>
      </div>
    </span>
  );
}
