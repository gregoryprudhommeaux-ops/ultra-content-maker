import { resolveLinkedInHashtagCount } from "@/lib/articles/editorial-os";
import type { PostBrief } from "@/types/workspace";

/** Default for generic UCM batches (no editorial OS). */
export const LINKEDIN_HASHTAG_COUNT = 4;

/** Normalize LLM output to up to `max` tag labels without leading #. */
export function normalizeHashtags(
  raw: unknown,
  max: number = LINKEDIN_HASHTAG_COUNT,
): string[] {
  const limit = Math.max(1, Math.min(4, max));
  const arr = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(/[\s,]+/)
      : [];
  const out: string[] = [];
  for (const item of arr) {
    const tag = String(item)
      .trim()
      .replace(/^#+/, "")
      .replace(/\s+/g, "");
    if (!tag || out.includes(tag)) continue;
    out.push(tag);
    if (out.length >= limit) break;
  }
  return out;
}

/** Cap from brief editorial OS (TEASER / Gregory / LA MESA → 2). */
export function normalizeHashtagsForBrief(
  raw: unknown,
  brief?: PostBrief | null,
): string[] {
  return normalizeHashtags(raw, resolveLinkedInHashtagCount(brief));
}

/** Single line for LinkedIn paste: #Tag1 #Tag2 … */
export function formatHashtagsLine(tags: string[]): string {
  return normalizeHashtags(tags)
    .map((t) => `#${t}`)
    .join(" ");
}
