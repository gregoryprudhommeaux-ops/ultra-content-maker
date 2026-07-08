"use client";

import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** Legacy `/articles` hub URL → dashboard (preserves filters). */
export function ArticlesPageRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(qs ? `/dashboard?${qs}` : "/dashboard");
  }, [router, searchParams]);

  return <GeneratingIndicator label="…" className="max-w-xl" />;
}
