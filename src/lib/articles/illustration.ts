import type { ArticleIllustration, IllustrationFormat } from "@/types/workspace";

export const ILLUSTRATION_FORMATS: IllustrationFormat[] = [
  "photo",
  "illustration",
  "drawing",
  "chart",
  "graph",
  "infographic",
  "diagram",
  "quote_card",
  "screenshot_mockup",
];

export function isIllustrationFormat(value: string): value is IllustrationFormat {
  return (ILLUSTRATION_FORMATS as readonly string[]).includes(value);
}

export function normalizeArticleIllustration(
  raw: unknown,
): ArticleIllustration | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const format = o.format;
  if (typeof format !== "string" || !isIllustrationFormat(format)) return undefined;

  const promptsRaw = o.imagePrompts;
  const imagePrompts = Array.isArray(promptsRaw)
    ? promptsRaw
        .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
        .map((p) => p.trim())
        .slice(0, 3)
    : [];

  while (imagePrompts.length < 3) {
    imagePrompts.push("");
  }

  if (!imagePrompts.some((p) => p.length > 0)) return undefined;

  const rationale =
    typeof o.rationale === "string" ? o.rationale.trim() : "";
  const searchKeywords =
    typeof o.searchKeywords === "string" ? o.searchKeywords.trim() : undefined;

  const altFormatsRaw = o.alternativeFormats;
  const alternativeFormats = Array.isArray(altFormatsRaw)
    ? altFormatsRaw
        .filter((f): f is IllustrationFormat => isIllustrationFormat(String(f)))
        .filter((f) => f !== format)
        .slice(0, 3)
    : undefined;

  return {
    format,
    rationale: rationale || "—",
    imagePrompts: imagePrompts as [string, string, string],
    searchKeywords: searchKeywords || undefined,
    alternativeFormats: alternativeFormats?.length ? alternativeFormats : undefined,
  };
}
