"use client";

import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** Legacy /setup/inspirations → author profile inspirations tab. */
export function InspirationsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const from = searchParams.get("from");
    const qs = from
      ? `?tab=inspirations&from=${encodeURIComponent(from)}`
      : "?tab=inspirations";
    router.replace(`/setup/author${qs}`);
  }, [router, searchParams]);

  return <GeneratingIndicator label="…" className="max-w-xl" />;
}
