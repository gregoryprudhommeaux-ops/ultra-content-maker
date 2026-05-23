import { ArticleCreationWizard } from "@/components/articles/article-creation-wizard";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { Suspense } from "react";

export default function ArticleCreationPage() {
  return (
    <Suspense fallback={<GeneratingIndicator label="…" className="max-w-xl" />}>
      <ArticleCreationWizard />
    </Suspense>
  );
}
