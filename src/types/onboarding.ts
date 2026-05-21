export type OnboardingStepNumber = 1 | 2 | 3 | 4 | 5;

export interface OnboardingStep1 {
  role: string;
  offer: string;
  positioningOneLiner: string;
}

export interface OnboardingStep2 {
  icp: string;
  pains: string;
  objections: string;
  proof: string;
}

export interface OnboardingStep3 {
  tone: string;
  wordsToAvoid: string;
  largeNicheRatio: string;
  ctaStyle: string;
  psRule: string;
}

export interface OnboardingStep4 {
  contentLanguage: "en" | "fr" | "es";
}

export interface OnboardingStep5 {
  linkedinUrl: string;
  websiteUrl: string;
  bio: string;
  postExamples: string;
  googleDocUrl: string;
}

export type OnboardingStepPayload =
  | OnboardingStep1
  | OnboardingStep2
  | OnboardingStep3
  | OnboardingStep4
  | OnboardingStep5;

export const ONBOARDING_STEP_COUNT = 5;
