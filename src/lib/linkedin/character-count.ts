/** LinkedIn feed post limit (composer). */
export const LINKEDIN_POST_CHARACTER_LIMIT = 3000;

/**
 * Count characters the way LinkedIn's composer does: by visible grapheme clusters
 * (simple emoji = 1, composite emoji with ZWJ = multiple).
 */
export function countLinkedInCharacters(text: string): number {
  if (!text) return 0;

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });
    let n = 0;
    for (const _ of segmenter.segment(text)) n += 1;
    return n;
  }

  return [...text].length;
}

export function isOverLinkedInPostLimit(text: string): boolean {
  return countLinkedInCharacters(text) > LINKEDIN_POST_CHARACTER_LIMIT;
}

/** Grapheme-safe trim to at most max characters (LinkedIn counting). */
export function truncateToLinkedInLimit(
  text: string,
  max: number = LINKEDIN_POST_CHARACTER_LIMIT,
): string {
  if (!text || countLinkedInCharacters(text) <= max) return text.trimEnd();

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });
    let n = 0;
    let result = "";
    for (const { segment } of segmenter.segment(text)) {
      if (n >= max) break;
      result += segment;
      n += 1;
    }
    return result.trimEnd();
  }

  return [...text].slice(0, max).join("").trimEnd();
}
