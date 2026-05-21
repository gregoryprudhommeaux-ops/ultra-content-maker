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
