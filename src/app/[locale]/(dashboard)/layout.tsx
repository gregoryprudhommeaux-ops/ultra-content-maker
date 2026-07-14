import { AuthProvider } from "@/components/auth/auth-provider";
import { OnboardingRouteGuard } from "@/components/onboarding/onboarding-route-guard";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { OnboardingProgressProvider } from "@/contexts/onboarding-progress-context";
import { WorkspaceProvider } from "@/contexts/workspace-context";
import { AdminClaimBootstrap } from "@/components/admin/admin-claim-bootstrap";
import { DashboardShell } from "@/components/dashboard-shell";
import { RequireAuth } from "@/components/auth/require-auth";
import { LlmKeyDialog } from "@/components/settings/llm-key-dialog";
import { SubscriptionProvider } from "@/contexts/subscription-context";
import { UpgradeModalProvider } from "@/contexts/upgrade-modal-context";
import { SubscriptionBanner } from "@/components/subscription/subscription-banner";
import { SubscriptionExpiredGuard } from "@/components/subscription/subscription-expired-guard";
import { UpgradeModal } from "@/components/subscription/upgrade-modal";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <RequireAuth>
        <WorkspaceProvider>
          <SubscriptionProvider>
          <UpgradeModalProvider>
          <AdminClaimBootstrap />
          <OnboardingProgressProvider>
            <DashboardShell>
            <SubscriptionBanner />
            <LlmKeyDialog />
            <UpgradeModal />
            <OnboardingStepper placement="dashboard" />
            <SubscriptionExpiredGuard>
              <OnboardingRouteGuard>{children}</OnboardingRouteGuard>
            </SubscriptionExpiredGuard>
            </DashboardShell>
          </OnboardingProgressProvider>
          </UpgradeModalProvider>
          </SubscriptionProvider>
        </WorkspaceProvider>
      </RequireAuth>
    </AuthProvider>
  );
}
