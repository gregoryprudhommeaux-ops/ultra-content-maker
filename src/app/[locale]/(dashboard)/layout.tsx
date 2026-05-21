import { DashboardOnboardingLayout } from "@/components/dashboard/dashboard-onboarding-layout";
import { DashboardShell } from "@/components/dashboard-shell";
import { RequireAuth } from "@/components/auth/require-auth";
import { LlmKeyDialog } from "@/components/settings/llm-key-dialog";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <DashboardShell>
        <LlmKeyDialog />
        <DashboardOnboardingLayout>{children}</DashboardOnboardingLayout>
      </DashboardShell>
    </RequireAuth>
  );
}
