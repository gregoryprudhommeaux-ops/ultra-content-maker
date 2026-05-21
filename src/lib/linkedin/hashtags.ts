export const LINKEDIN_HASHTAG_COUNT = 4;

/** Normalize LLM output to up to 4 tag labels without leading #. */
export function normalizeHashtags(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[\s,]+/) : [];
  const out: string[] = [];
  for (const item of arr) {
    const tag = String(item)
      .trim()
      .replace(/^#+/, "")
      .replace(/\s+/g, "");
    if (!tag || out.includes(tag)) continue;
    out.push(tag);
    if (out.length >= LINKEDIN_HASHTAG_COUNT) break;
  }
  return out;
}

/** Single line for LinkedIn paste: #Tag1 #Tag2 #Tag3 #Tag4 */
export function formatHashtagsLine(tags: string[]): string {
  return normalizeHashtags(tags)
    .map((t) => `#${t}`)
    .join(" ");
}
