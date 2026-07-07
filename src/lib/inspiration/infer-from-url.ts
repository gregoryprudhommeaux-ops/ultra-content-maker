import type { SourceCategory, SourceType } from "@/types/workspace";

export type InferredInspiration = {
  category: Extract<SourceCategory, "inspiration_post" | "inspiration_profile">;
  type: Extract<SourceType, "linkedin_post" | "linkedin_profile">;
};

/** Infer stored source type from any reference URL (UI does not ask the user). */
export function inferSourceTypeFromUrl(url: string): SourceType {
  const lower = url.trim().toLowerCase();
  if (!lower) return "other";

  if (
    /linkedin\.com\/posts\//.test(lower) ||
    /linkedin\.com\/feed\/update\//.test(lower) ||
    /linkedin\.com\/pulse\//.test(lower) ||
    /linkedin\.com/.test(lower)
  ) {
    return "linkedin_post";
  }

  return "other";
}

/** Classify a LinkedIn URL as inspiration post or profile. */
export function inferInspirationFromUrl(url: string): InferredInspiration | null {
  const lower = url.trim().toLowerCase();

  if (
    /linkedin\.com\/posts\//.test(lower) ||
    /linkedin\.com\/feed\/update\//.test(lower) ||
    /linkedin\.com\/pulse\//.test(lower)
  ) {
    return { category: "inspiration_post", type: "linkedin_post" };
  }

  if (/linkedin\.com\/in\/[^/?#]+/.test(lower)) {
    if (/\/recent-activity|\/detail\/recent-activity/.test(lower)) return null;
    return { category: "inspiration_profile", type: "linkedin_profile" };
  }

  return null;
}

export function normalizeSourceUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, "");
}
