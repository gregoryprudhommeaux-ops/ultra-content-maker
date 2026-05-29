import type { OnboardingStepKey, OnboardingStepState } from "./onboarding-progress";
import { loadOnboardingProgress, ONBOARDING_STEPS } from "./onboarding-progress";
import { resolveNextStep } from "./onboarding-status";

/** Explicit completion flags for guards, nav, and analytics. */
export type SetupCompletion = {
  hasApiKey: boolean;
  hasProfileMinimum: boolean;
  hasAudience: boolean;
  hasPersonaValidated: boolean;
  hasGeneratedPost: boolean;
  /** All five onboarding steps done (incl. at least one batch). */
  isOnboardingComplete: boolean;
};

/** Steps required before opening the creation wizard (not incl. first generated post). */
export const CREATION_GATE_STEPS: readonly OnboardingStepKey[] = [
  "llm",
  "author",
  "audience",
  "persona",
] as const;

export type CreationGateResult = {
  allowed: boolean;
  completion: SetupCompletion;
  missingStep: OnboardingStepKey | null;
  redirectHref: string | null;
};

export function completionFromSteps(
  steps: OnboardingStepState[],
  completedCount?: number,
): SetupCompletion {
  const byKey = Object.fromEntries(steps.map((s) => [s.key, s.complete])) as Record<
    OnboardingStepKey,
    boolean
  >;

  const done = completedCount ?? steps.filter((s) => s.complete).length;

  return {
    hasApiKey: byKey.llm ?? false,
    hasProfileMinimum: byKey.author ?? false,
    hasAudience: byKey.audience ?? false,
    hasPersonaValidated: byKey.persona ?? false,
    hasGeneratedPost: byKey.articles ?? false,
    isOnboardingComplete: done >= steps.length,
  };
}

export function evaluateCreationGate(completion: SetupCompletion): CreationGateResult {
  const missing = CREATION_GATE_STEPS.find((key) => !completion[stepToFlag(key)]);
  if (!missing) {
    return {
      allowed: true,
      completion,
      missingStep: null,
      redirectHref: null,
    };
  }

  const { nextHref } = resolveNextStep(completion);
  return {
    allowed: false,
    completion,
    missingStep: missing,
    redirectHref: nextHref,
  };
}

function stepToFlag(key: OnboardingStepKey): keyof SetupCompletion {
  switch (key) {
    case "llm":
      return "hasApiKey";
    case "author":
      return "hasProfileMinimum";
    case "audience":
      return "hasAudience";
    case "persona":
      return "hasPersonaValidated";
    case "articles":
      return "hasGeneratedPost";
  }
}

export async function loadSetupCompletion(userId: string): Promise<SetupCompletion> {
  const progress = await loadOnboardingProgress(userId, null);
  return completionFromSteps(progress.steps, progress.completedCount);
}

export async function loadCreationGate(userId: string): Promise<CreationGateResult> {
  const progress = await loadOnboardingProgress(userId, null);
  const completion = completionFromSteps(progress.steps, progress.completedCount);
  return evaluateCreationGate(completion);
}
