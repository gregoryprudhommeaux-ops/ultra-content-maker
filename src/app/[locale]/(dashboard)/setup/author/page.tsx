import { AuthorSetupForm } from "@/components/setup/author-setup-form";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { Suspense } from "react";

export default function AuthorSetupPage() {
  return (
    <Suspense fallback={<GeneratingIndicator label="…" className="max-w-xl" />}>
      <AuthorSetupForm />
    </Suspense>
  );
}
