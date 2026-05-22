import { NewsArchiveHub } from "@/components/news/news-archive-hub";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { Suspense } from "react";

export default function NewsPage() {
  return (
    <Suspense fallback={<GeneratingIndicator label="…" className="max-w-xl" />}>
      <NewsArchiveHub />
    </Suspense>
  );
}
