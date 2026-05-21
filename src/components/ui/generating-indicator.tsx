type Props = {
  label: string;
  hint?: string;
  className?: string;
};

/** Spinner + progress feedback during long LLM calls. */
export function GeneratingIndicator({ label, hint, className = "" }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex items-start gap-4 rounded-2xl border border-gray-100 bg-ns-brand-light p-5 ${className}`}
    >
      <div
        className="relative flex h-10 w-10 shrink-0 items-center justify-center"
        aria-hidden
      >
        <span className="absolute h-10 w-10 animate-spin rounded-full border-2 border-ns-alternate border-t-ns-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black uppercase tracking-tight text-ns-tertiary">
          {label}
        </p>
        {hint ? (
          <p className="mt-1 text-sm font-medium leading-relaxed text-ns-secondary">
            {hint}
          </p>
        ) : null}
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-ns-alternate">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-ns-primary" />
        </div>
      </div>
    </div>
  );
}

export function ButtonSpinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black ${className}`}
      aria-hidden
    />
  );
}
