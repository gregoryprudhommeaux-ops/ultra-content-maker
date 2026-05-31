import { AuthProvider } from "@/components/auth/auth-provider";
import { OnboardingRouteGuard } from "@/components/onboarding/onboarding-route-guard";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { OnboardingProgressProvider } from "@/contexts/onboarding-progress-context";
import { WorkspaceProvider } from "@/contexts/workspace-context";
import { AdminClaimBootstrap } from "@/components/admin/admin-claim-bootstrap";
import { DashboardShell } from "@/components/dashboard-shell";
import { RequireAuth } from "@/components/auth/require-auth";
import { LlmKeyDialog } from "@/components/settings/llm-key-dialog";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <RequireAuth>
        <WorkspaceProvider>
          <AdminClaimBootstrap />
          <OnboardingProgressProvider>
            <DashboardShell>
            <LlmKeyDialog />
            <OnboardingStepper placement="dashboard" />
            <OnboardingRouteGuard>{children}</OnboardingRouteGuard>
            </DashboardShell>
          </OnboardingProgressProvider>
        </WorkspaceProvider>
      </RequireAuth>
    </AuthProvider>
  );
}
