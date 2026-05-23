import { NewsArchiveList } from "@/components/news/news-archive-list";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { Suspense } from "react";

export default function NewsArchivePage() {
  return (
    <Suspense fallback={<GeneratingIndicator label="…" className="max-w-xl" />}>
      <NewsArchiveList />
    </Suspense>
  );
}
