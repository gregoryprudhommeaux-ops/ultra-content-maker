type Props = {
  features: string[];
  /** Light text on dark cards */
  variant?: "default" | "onDark";
};

export function PlanFeatureList({ features, variant = "default" }: Props) {
  const textClass = variant === "onDark" ? "text-white/85" : "text-ns-secondary";
  const checkClass = variant === "onDark" ? "text-ns-primary" : "text-ns-primary";

  return (
    <ul className={`space-y-2.5 text-sm leading-relaxed ${textClass}`}>
      {features.map((f) => (
        <li key={f} className="flex gap-2.5">
          <span className={`mt-0.5 shrink-0 ${checkClass}`} aria-hidden>
            ✓
          </span>
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
}
