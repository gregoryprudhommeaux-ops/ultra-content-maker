"use client";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { use } from "react";

type Props = { params: Promise<{ id: string }> };

export default function ClientOnboardingPage({ params }: Props) {
  const { id } = use(params);
  return <OnboardingWizard clientId={id} />;
}
