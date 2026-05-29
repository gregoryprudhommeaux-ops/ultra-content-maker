import { ArticleCreationWizard } from "@/components/articles/article-creation-wizard";
import { OnboardingGuard } from "@/components/onboarding/onboarding-guard";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { Suspense } from "react";

export default function ArticleCreationPage() {
  return (
    <Suspense fallback={<GeneratingIndicator label="…" className="max-w-xl" />}>
      <OnboardingGuard mode="creation" redirect>
        <ArticleCreationWizard />
      </OnboardingGuard>
    </Suspense>
  );
}
