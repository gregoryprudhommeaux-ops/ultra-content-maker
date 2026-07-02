import { getAudienceProfile } from "./audience";
import { getAuthorProfile, isAuthorProfileExpressComplete } from "./author";
import { listArticleBatches } from "./articles";
import { getUserLlmProfile } from "./llm-settings";
import { getPersona } from "./persona";
import { getUserDoc } from "./user";
import {
  normalizeSubscriptionProfile,
  resolveSubscriptionAccess,
} from "@/lib/subscription/access";
import type { SetupCompletion } from "./setup-completion";
import {
 getOnboardingStatusFromProgress,
 resolveCreationBlockHref,
} from "./onboarding-status";

export type OnboardingStepKey = "llm" | "express" | "audience" | "persona" | "articles";

export type StepVisualStatus = "complete" | "current" | "available" | "locked";

export const ONBOARDING_STEPS: ReadonlyArray<{
 key: OnboardingStepKey;
 href: string;
}> = [
 { key: "llm", href: "/setup/llm" },
 { key: "express", href: "/setup/express" },
 { key: "audience", href: "/setup/audience" },
 { key: "persona", href: "/persona" },
 { key: "articles", href: "/articles/new" },
] as const;

export type OnboardingStepState = {
 key: OnboardingStepKey;
 href: string;
 complete: boolean;
 status: StepVisualStatus;
};

export type OnboardingProgress = {
 steps: OnboardingStepState[];
 percent: number;
 completedCount: number;
 nextStep: OnboardingStepKey | null;
 nextHref: string | null;
 /** Explicit flags · use for guards and nav badges. */
 completion: SetupCompletion;
 /** True when API key, profile, audience and persona are ready for /articles/new. */
 canAccessCreation: boolean;
 creationRedirectHref: string | null;
};

function isAudienceComplete(
 audience: Awaited<ReturnType<typeof getAudienceProfile>>,
): boolean {
 if (!audience) return false;
 if (audience.skipped) return true;
 return Boolean(audience.targetLabel?.trim() || audience.contentFocus?.trim());
}

function pathMatchesStep(
 pathname: string | null,
 href: string,
 key: OnboardingStepKey,
): boolean {
 if (!pathname) return false;
 if (key === "articles") {
 return pathname === "/articles" || pathname.startsWith("/articles/");
 }
 return pathname === href || pathname.startsWith(`${href}/`);
}

export async function loadOnboardingProgress(
 userId: string,
 pathname: string | null,
): Promise<OnboardingProgress> {
 const [userDoc, llm, author, audience, persona, batches] = await Promise.all([
 getUserDoc(userId),
 getUserLlmProfile(userId),
 getAuthorProfile(userId),
 getAudienceProfile(userId),
 getPersona(userId),
 listArticleBatches(userId),
 ]);

 const hasOwnApiKey = Boolean(llm?.userProvided && llm?.apiKey?.trim());
 const usesOwnerLlm = Boolean(userDoc?.linkedWorkspace?.ownerId);
 const usesAgencyLlm = Boolean(userDoc?.managedBy?.adminUid);
 const usesSharedLlm = usesOwnerLlm || usesAgencyLlm;
 const subscription = normalizeSubscriptionProfile(userDoc?.subscription);
 const access = resolveSubscriptionAccess(subscription, {
   isPlatformAdmin: userDoc?.isPlatformAdmin,
   hasLinkedWorkspace: usesSharedLlm,
 });
 const hasPlatformLlm =
   access.canUsePlatformLlm && !hasOwnApiKey && !usesSharedLlm;

 const completion: Record<OnboardingStepKey, boolean> = {
   llm: hasOwnApiKey || usesSharedLlm || hasPlatformLlm,
 express: isAuthorProfileExpressComplete(author),
 audience: isAudienceComplete(audience),
 persona: persona?.status === "validated" || Boolean(persona?.promptText?.trim()),
 articles: batches.some((b) => b.articles.length > 0),
 };

 const completedCount = ONBOARDING_STEPS.filter((s) => completion[s.key]).length;
 const percent = Math.round((completedCount / ONBOARDING_STEPS.length) * 100);

 let previousAllComplete = true;
 const steps: OnboardingStepState[] = ONBOARDING_STEPS.map(({ key, href }) => {
 const complete = completion[key];
 let status: StepVisualStatus;
 if (complete) {
 status = "complete";
 } else if (pathMatchesStep(pathname, href, key)) {
 status = "current";
 } else if (previousAllComplete) {
 status = "available";
 } else {
 status = "locked";
 }
 if (!complete) previousAllComplete = false;
 return { key, href, complete, status };
 });

 const next = ONBOARDING_STEPS.find((s) => !completion[s.key]) ?? null;

 const { completionFromSteps, evaluateCreationGate } = await import(
 "./setup-completion"
 );

 const setupCompletion = completionFromSteps(steps, completedCount);
 const gate = evaluateCreationGate(setupCompletion);

 const draft: OnboardingProgress = {
 steps,
 percent,
 completedCount,
 nextStep: next?.key ?? null,
 nextHref: next?.href ?? null,
 completion: setupCompletion,
 canAccessCreation: gate.allowed,
 creationRedirectHref: null,
 };

 const status = getOnboardingStatusFromProgress(draft);

 return {
 ...draft,
 nextHref: status.nextHref,
 creationRedirectHref: gate.allowed
 ? null
 : resolveCreationBlockHref(status),
 };
}
