"use client";

import type { WizardCreationMode } from "@/lib/prompts/post-brief";
import { useTranslations } from "next-intl";

export type WizardStepId = "mode" | "context" | "brief" | "result" | "generating";

function flowForMode(mode: WizardCreationMode | null): WizardStepId[] {
  if (mode === "profile") return ["mode", "brief", "result"];
  return ["mode", "context", "brief", "result"];
}

export function resolveWizardProgressStep(
  step: string,
  mode: WizardCreationMode | null,
): WizardStepId {
  if (step === "mode") return "mode";
  if (step === "generating") return "generating";
  if (step === "draft-done") return "result";
  if (step === "brief") return "brief";
  if (
    step === "news" ||
    step === "paste" ||
    step === "inspiration-input" ||
    step === "inspiration-url" ||
    step === "inspiration-library"
  ) {
    return "context";
  }
  return "mode";
}

type Props = {
  mode: WizardCreationMode | null;
  activeStep: WizardStepId;
};

export function WizardProgress({ mode, activeStep }: Props) {
  const t = useTranslations("setup.articles.create.progress");

  if (activeStep === "generating") {
    return (
      <p className="text-xs font-medium text-ns-secondary" aria-live="polite">
        {t("generating")}
      </p>
    );
  }

  const flow = flowForMode(mode);
  const current = flow.indexOf(activeStep);

  const labels: Record<WizardStepId, string> = {
    mode: t("mode"),
    context:
      mode === "news"
        ? t("contextNews")
        : mode === "inspiration"
          ? t("contextInspiration")
          : t("contextProfile"),
    brief: t("brief"),
    result: t("result"),
    generating: t("generating"),
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
