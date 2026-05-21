"use client";

import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { OnboardingProgressProvider } from "@/contexts/onboarding-progress-context";
import type { ReactNode } from "react";

/** Single stepper + shared progress state for all dashboard routes. */
export function DashboardOnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <OnboardingProgressProvider>
      <OnboardingStepper />
      {children}
    </OnboardingProgressProvider>
  );
}
