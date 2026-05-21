import { HomeRedirect } from "@/components/setup/home-redirect";
import { RequireAuth } from "@/components/auth/require-auth";
import { DashboardShell } from "@/components/dashboard-shell";

export default function LocaleHomePage() {
  return (
    <RequireAuth>
      <DashboardShell>
        <HomeRedirect />
      </DashboardShell>
    </RequireAuth>
  );
}
