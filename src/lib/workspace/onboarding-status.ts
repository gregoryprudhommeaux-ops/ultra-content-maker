import type { OnboardingProgress } from "./onboarding-progress";
import type { SetupCompletion } from "./setup-completion";
import {
  ONBOARDING_READY_PATH,
  ONBOARDING_WELCOME_PATH,
} from "./onboarding-routes";

/** Single source of truth for “where should this user go next?”. */
export type OnboardingNextStep =
  | "setup-llm"
  | "setup-express"
  | "author-essential"
  | "audience"
  | "persona"
  | "start-ready"
  | "articles-new"
  | "start-hub";

export type OnboardingStatus = {
  hasApiKey: boolean;
  hasProfileMinimum: boolean;
  hasAudience: boolean;
  /** Persona validated (creation gate). */
  personaValidated: boolean;
  hasGeneratedFirstDraft: boolean;
  isReadyToCreate: boolean;
  isOnboardingComplete: boolean;
  nextStep: OnboardingNextStep;
  nextHref: string;
  /** Same flags as SetupCompletion for guards / nav badges. */
  completion: SetupCompletion;
};

export function resolveNextStep(completion: SetupCompletion): {
  nextStep: OnboardingNextStep;
  nextHref: string;
} {
  if (!completion.hasApiKey) {
    return { nextStep: "setup-llm", nextHref: "/setup/llm" };
  }
  if (!completion.hasProfileMinimum) {
    return {
      nextStep: "setup-express",
      nextHref: "/setup/express",
    };
  }
  if (!completion.hasAudience) {
    return { nextStep: "audience", nextHref: "/setup/audience" };
  }
  if (!completion.hasPersonaValidated) {
    return { nextStep: "persona", nextHref: "/persona" };
  }
  if (!completion.hasGeneratedPost) {
    return { nextStep: "start-ready", nextHref: ONBOARDING_READY_PATH };
  }
  if (completion.isOnboardingComplete) {
    return { nextStep: "articles-new", nextHref: "/articles/new" };
  }
  return { nextStep: "start-hub", nextHref: ONBOARDING_WELCOME_PATH };
}

export function getOnboardingStatusFromProgress(
  progress: OnboardingProgress,
): OnboardingStatus {
  const { completion } = progress;
  const { nextStep, nextHref } = resolveNextStep(completion);

  return {
    hasApiKey: completion.hasApiKey,
    hasProfileMinimum: completion.hasProfileMinimum,
    hasAudience: completion.hasAudience,
    personaValidated: completion.hasPersonaValidated,
    hasGeneratedFirstDraft: completion.hasGeneratedPost,
    isReadyToCreate: progress.canAccessCreation,
    isOnboardingComplete: completion.isOnboardingComplete,
    nextStep,
    nextHref,
    completion,
  };
}

/** Redirect target when creation is blocked (never land “empty” on /articles/new). */
export function resolveCreationBlockHref(status: OnboardingStatus): string {
  if (status.isReadyToCreate) {
    return "/articles/new";
  }
  return status.nextHref;
}

/** True when pathname points to a setup step that is still locked. */
export function isPathLockedForProgress(
  pathname: string | null,
  progress: OnboardingProgress,
): boolean {
  if (!pathname) return false;
  if (pathname === ONBOARDING_WELCOME_PATH || pathname.startsWith("/start/")) {
    return false;
  }

  const isSetupPath =
    pathname.startsWith("/setup/") ||
    pathname === "/persona" ||
    pathname.startsWith("/persona/") ||
    pathname === "/articles/new" ||
    pathname.startsWith("/articles/new?");

  if (!isSetupPath) {
    return false;
  }

  const step = progress.steps.find((s) => {
    if (s.key === "articles") {
      return pathname === "/articles/new" || pathname.startsWith("/articles/new?");
    }
    return (
      pathname === s.href ||
      pathname.startsWith(`${s.href}/`) ||
      pathname.startsWith(`${s.href}?`)
    );
  });

  return step?.status === "locked";
}
