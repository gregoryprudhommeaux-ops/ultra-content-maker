"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  features: string[];
  maxVisible?: number;
  /** Light text on dark cards */
  variant?: "default" | "onDark";
};

export function PlanFeatureList({ features, maxVisible = 4, variant = "default" }: Props) {
  const t = useTranslations("pricing");
  const [expanded, setExpanded] = useState(false);
  const hasMore = features.length > maxVisible;
  const visible = expanded ? features : features.slice(0, maxVisible);

  const textClass = variant === "onDark" ? "text-white/85" : "text-ns-secondary";
  const checkClass = variant === "onDark" ? "text-ns-primary" : "text-ns-primary";
  const toggleClass =
    variant === "onDark"
      ? "text-ns-primary hover:text-white"
      : "text-ns-primary hover:text-ns-tertiary";

  return (
    <div>
      <ul className={`space-y-2.5 text-sm leading-relaxed ${textClass}`}>
        {visible.map((f) => (
          <li key={f} className="flex gap-2.5">
            <span className={`mt-0.5 shrink-0 ${checkClass}`} aria-hidden>
              ✓
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`mt-3 text-xs font-semibold underline-offset-2 hover:underline ${toggleClass}`}
        >
          {expanded ? t("hideFeatures") : t("showAllFeatures")}
        </button>
      ) : null}
    </div>
  );
}
