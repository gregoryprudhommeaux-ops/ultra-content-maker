import type { OnboardingProgress } from "@/lib/workspace/onboarding-progress";

/**
 * True only while the first onboarding progress fetch is in flight (no cached
 * progress yet). Silent refreshes after `notifyOnboardingProgressChanged()` keep
 * `loading` false and leave existing `progress` in place · guards must not treat
 * bare `loading` as a full-page block after bootstrap.
 */
export function isOnboardingBootstrapping(
 loading: boolean,
 progress: OnboardingProgress | null,
): boolean {
 return loading && progress === null;
}
