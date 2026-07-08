import { DashboardHub } from "@/components/dashboard/dashboard-hub";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { Suspense } from "react";

export default function DashboardPage() {
  return (
    <Suspense fallback={<GeneratingIndicator label="…" className="max-w-xl" />}>
      <DashboardHub />
    </Suspense>
  );
}
