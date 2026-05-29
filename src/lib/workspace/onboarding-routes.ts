import type { OnboardingProgress } from "./onboarding-progress";
import { loadCreationGate } from "./setup-completion";
import { ONBOARDING_STEPS } from "./onboarding-progress";

/** Default entry for guided onboarding. */
export const ONBOARDING_WELCOME_PATH = "/start";
export const ONBOARDING_READY_PATH = "/start/ready";

/** Client-side home link from cached onboarding progress (logo, nav Accueil). */
export function resolveHomeHrefFromProgress(
  progress: OnboardingProgress | null | undefined,
): string {
  if (!progress) return ONBOARDING_WELCOME_PATH;

  /** Assistant de création = hub d’accueil dès que la création est débloquée. */
  if (progress.canAccessCreation) {
    return "/articles/new";
  }

  return ONBOARDING_WELCOME_PATH;
}

/** Where /start should redirect when the user should not see the welcome screen. */
export function resolveWelcomeRedirect(
  progress: OnboardingProgress | null | undefined,
): string | null {
  if (!progress) return null;

  if (progress.completion.isOnboardingComplete) {
    return "/articles/new";
  }

  if (progress.canAccessCreation && !progress.completion.hasGeneratedPost) {
    return ONBOARDING_READY_PATH;
  }

  return null;
}

/** Where to send the user after sign-in or when opening the app. */
export async function resolveLandingPath(userId: string): Promise<string> {
  const gate = await loadCreationGate(userId);

  if (gate.completion.isOnboardingComplete) {
    return "/articles/new";
  }

  if (gate.allowed && !gate.completion.hasGeneratedPost) {
    return ONBOARDING_READY_PATH;
  }

  if (!gate.allowed) {
    if (!gate.completion.hasApiKey) {
      return ONBOARDING_WELCOME_PATH;
    }
    return gate.redirectHref ?? ONBOARDING_WELCOME_PATH;
  }

  return ONBOARDING_WELCOME_PATH;
}

export function hrefForOnboardingStep(
  key: (typeof ONBOARDING_STEPS)[number]["key"],
): string {
  return ONBOARDING_STEPS.find((s) => s.key === key)?.href ?? "/setup/llm";
}
