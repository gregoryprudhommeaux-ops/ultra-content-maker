import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { Suspense } from "react";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense fallback={<GeneratingIndicator label="…" className="max-w-xl" />}>
      <ProjectWorkspace projectId={id} />
    </Suspense>
  );
}
