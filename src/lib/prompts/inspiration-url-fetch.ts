import type { ContentLanguage } from "@/types/workspace";

export function buildInspirationUrlFetchSystemPrompt(
  contentLanguage: ContentLanguage,
): string {
  const langNote =
    contentLanguage === "fr"
      ? "Keep the excerpt in the page's original language (often French)."
      : contentLanguage === "es"
        ? "Keep the excerpt in the page's original language (often Spanish)."
        : "Keep the excerpt in the page's original language.";

  return `You retrieve the main readable text from a public web page URL so an author can repurpose it into a new LinkedIn post (not copy verbatim later — extraction only).

Return JSON only:
{
  "title": "short page or post title",
  "excerpt": "main body text — post content or article core",
  "accessible": true
}

Rules:
- excerpt: factual extraction of the primary content (LinkedIn post body, article text). No AI commentary.
- Max 5500 characters in excerpt; prefer the full post/article body when available.
- If the page is paywalled, login-only, or unreachable, set accessible to false and excerpt to "".
- ${langNote}
- Do not invent quotes that are not on the page.`;
}

export function buildInspirationUrlFetchUserPrompt(url: string): string {
  return `Extract the main content from this URL for editorial repurposing:\n${url}`;
}

export type InspirationUrlFetchLlmResult = {
  title?: string;
  excerpt?: string;
  accessible?: boolean;
};

export function normalizeInspirationUrlFetchResult(
  parsed: InspirationUrlFetchLlmResult,
): { title: string; excerpt: string } | null {
  if (parsed.accessible === false) return null;
  const excerpt = (parsed.excerpt ?? "").trim();
  if (excerpt.length < 40) return null;
  return {
    title: (parsed.title ?? "").trim(),
    excerpt,
  };
}
