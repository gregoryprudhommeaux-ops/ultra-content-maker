import { ArticlesHub } from "@/components/articles/articles-hub";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { Suspense } from "react";

export default function ArticlesPage() {
  return (
    <Suspense fallback={<GeneratingIndicator label="…" className="max-w-xl" />}>
      <ArticlesHub />
    </Suspense>
  );
}
