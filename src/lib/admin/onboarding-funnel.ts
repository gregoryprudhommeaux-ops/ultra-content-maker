import type { AdminUserMetrics } from "@/lib/admin/analytics-types";

export type OnboardingFunnelStepKey =
  | "llm"
  | "author"
  | "audience"
  | "persona"
  | "firstArticle"
  | "firstValidated";

export const ONBOARDING_FUNNEL_STEP_KEYS: OnboardingFunnelStepKey[] = [
  "llm",
  "author",
  "audience",
  "persona",
  "firstArticle",
  "firstValidated",
];

export type OnboardingFunnelStep = {
  key: OnboardingFunnelStepKey;
  count: number;
  /** % of registered users in scope who reached this step. */
  percentOfRegistered: number;
  /** % of users who completed the previous step (100% for first step). */
  stepConversionPercent: number | null;
};

export function computeOnboardingFunnel(
  users: AdminUserMetrics[],
  includedUserIds: ReadonlySet<string>,
): { registered: number; steps: OnboardingFunnelStep[] } {
  const included = users.filter((u) => includedUserIds.has(u.userId));
  const registered = included.length;

  const counts: Record<OnboardingFunnelStepKey, number> = {
    llm: 0,
    author: 0,
    audience: 0,
    persona: 0,
    firstArticle: 0,
    firstValidated: 0,
  };

  for (const user of included) {
    const steps = user.onboardingSteps;
    if (steps.llm) counts.llm += 1;
    if (steps.author) counts.author += 1;
    if (steps.audience) counts.audience += 1;
    if (steps.persona) counts.persona += 1;
    if (steps.firstArticle) counts.firstArticle += 1;
    if (steps.firstValidated) counts.firstValidated += 1;
  }

  let previousCount = registered;
  const funnelSteps: OnboardingFunnelStep[] = ONBOARDING_FUNNEL_STEP_KEYS.map((key) => {
    const count = counts[key];
    const percentOfRegistered =
      registered > 0 ? Math.round((count / registered) * 100) : 0;
    const stepConversionPercent =
      previousCount > 0 ? Math.round((count / previousCount) * 100) : null;
    previousCount = count;
    return { key, count, percentOfRegistered, stepConversionPercent };
  });

  return { registered, steps: funnelSteps };
}
