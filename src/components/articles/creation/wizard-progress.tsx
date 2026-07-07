"use client";

import type { WizardCreationMode } from "@/lib/prompts/post-brief";
import { useTranslations } from "next-intl";

export type WizardPhaseId = "intent" | "context" | "briefing" | "generation" | "result";

function flowForMode(mode: WizardCreationMode | null): WizardPhaseId[] {
  if (mode === "profile" || mode === "article") return ["intent", "briefing", "result"];
  return ["intent", "context", "briefing", "result"];
}

export function resolveWizardProgressStep(
  step: string,
  mode: WizardCreationMode | null,
): WizardPhaseId {
  if (step === "mode") return "intent";
  if (step === "generating") return "generation";
  if (step === "draft-done") return "result";
  if (step === "brief") return "briefing";
  if (
    step === "news" ||
    step === "paste" ||
    step === "inspiration-input" ||
    step === "inspiration-url" ||
    step === "inspiration-library" ||
    step === "inspiration-document"
  ) {
    return "context";
  }
  return "intent";
}

type Props = {
  mode: WizardCreationMode | null;
  activeStep: WizardPhaseId;
};

export function WizardProgress({ mode, activeStep }: Props) {
  const t = useTranslations("setup.articles.create.progress");

  if (activeStep === "generation") {
    return (
      <p className="text-xs font-medium text-ns-secondary" aria-live="polite">
        {t("generation")}
      </p>
    );
  }

  const flow = flowForMode(mode);
  const current = flow.indexOf(activeStep);

  const labels: Record<WizardPhaseId, string> = {
    intent: t("intent"),
    context:
      mode === "news"
        ? t("contextNews")
        : mode === "inspiration"
          ? t("contextInspiration")
          : mode === "article"
            ? t("contextArticle")
            : t("contextProfile"),
    briefing: t("briefing"),
    result: t("result"),
    generation: t("generation"),
  };

  return (
    <nav aria-label={t("ariaLabel")} className="mb-4">
      <ol className="flex flex-wrap items-center gap-2 text-xs font-medium">
        {flow.map((id, i) => {
          const done = current >= 0 && i < current;
          const active = i === current;
          return (
            <li key={id} className="flex items-center gap-2">
              {i > 0 && (
                <span className="text-ns-secondary/40" aria-hidden>
                  →
                </span>
              )}
              <span
                className={
                  active
                    ? "rounded-full bg-ns-primary/20 px-2.5 py-1 text-ns-tertiary"
                    : done
                      ? "text-ns-secondary"
                      : "text-ns-secondary/50"
                }
              >
                {labels[id]}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
