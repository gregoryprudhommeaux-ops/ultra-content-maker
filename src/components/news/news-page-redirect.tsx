"use client";

import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { useRouter } from "@/i18n/navigation";
import { useEffect } from "react";

/** Legacy /news → wizard actualité */
export function NewsPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/articles/new?mode=news");
  }, [router]);

  return <GeneratingIndicator label="…" className="max-w-xl" />;
}
