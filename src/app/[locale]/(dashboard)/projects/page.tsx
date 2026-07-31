import { ProjectsHub } from "@/components/projects/projects-hub";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { Suspense } from "react";

export default function ProjectsPage() {
  return (
    <Suspense fallback={<GeneratingIndicator label="…" className="max-w-xl" />}>
      <ProjectsHub />
    </Suspense>
  );
}
