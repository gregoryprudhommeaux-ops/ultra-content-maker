import { InspirationsRedirect } from "@/components/setup/inspirations-redirect";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { Suspense } from "react";

export default function InspirationsSetupPage() {
  return (
    <Suspense fallback={<GeneratingIndicator label="…" className="max-w-xl" />}>
      <InspirationsRedirect />
    </Suspense>
  );
}
