import { AuthProvider } from "@/components/auth/auth-provider";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { OnboardingProgressProvider } from "@/contexts/onboarding-progress-context";
import { DashboardShell } from "@/components/dashboard-shell";
import { RequireAuth } from "@/components/auth/require-auth";
import { LlmKeyDialog } from "@/components/settings/llm-key-dialog";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <RequireAuth>
        <OnboardingProgressProvider>
          <DashboardShell>
            <LlmKeyDialog />
            <OnboardingStepper placement="dashboard" />
            {children}
          </DashboardShell>
        </OnboardingProgressProvider>
      </RequireAuth>
    </AuthProvider>
  );
}
