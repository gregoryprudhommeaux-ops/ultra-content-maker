import { InspirationsSetupForm } from "@/components/setup/inspirations-setup-form";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { Suspense } from "react";

export default function InspirationsSetupPage() {
  return (
    <Suspense fallback={<GeneratingIndicator label="…" className="max-w-xl" />}>
      <InspirationsSetupForm />
    </Suspense>
  );
}
