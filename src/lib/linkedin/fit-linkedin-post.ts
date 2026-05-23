import {
  countLinkedInCharacters,
  LINKEDIN_POST_CHARACTER_LIMIT,
  truncateToLinkedInLimit,
} from "@/lib/linkedin/character-count";
import { formatHashtagsLine } from "@/lib/linkedin/hashtags";

/** Room for CTA block + hashtags when fitting hook/body/ps at generation time. */
export const LINKEDIN_CTA_AND_TAGS_RESERVE = 320;

export type LinkedInPostParts = {
  hook: string;
  body: string;
  ps?: string;
};

export function joinLinkedInPostParts(parts: LinkedInPostParts): string {
  return [parts.hook, parts.body, parts.ps]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function countLinkedInPostParts(parts: LinkedInPostParts): number {
  return countLinkedInCharacters(joinLinkedInPostParts(parts));
}

/** Max hook+body+ps length before CTA / hashtags (generation & revise). */
export function maxDraftCharsForArticle(hashtags?: string[]): number {
  const tagLine = formatHashtagsLine(hashtags ?? []);
  const tagLen = tagLine ? countLinkedInCharacters(tagLine) + 2 : 0;
  return (
    LINKEDIN_POST_CHARACTER_LIMIT - LINKEDIN_CTA_AND_TAGS_RESERVE - tagLen
  );
}

function trimEndToCharLimit(text: string, maxChars: number): string {
  if (countLinkedInCharacters(text) <= maxChars) return text;

  const paragraphs = text.split(/\n\n+/);
  let acc = "";
  for (const p of paragraphs) {
    const next = acc ? `${acc}\n\n${p}` : p;
    if (countLinkedInCharacters(next) > maxChars) break;
    acc = next;
  }
  if (acc && countLinkedInCharacters(acc) <= maxChars) return acc.trimEnd();

  const sentences = text.split(/(?<=[.!?…])\s+/);
  acc = "";
  for (const s of sentences) {
    const next = acc ? `${acc} ${s}` : s;
    if (countLinkedInCharacters(next) > maxChars) break;
    acc = next;
  }
  if (acc && countLinkedInCharacters(acc) <= maxChars) return acc.trimEnd();

  return truncateToLinkedInLimit(text, maxChars);
}

/** Shrink hook/body/ps to fit maxChars (hook+body+ps only). Trims body first, then ps, then hook. */
export function fitLinkedInArticleParts(
  parts: LinkedInPostParts,
  maxChars: number = maxDraftCharsForArticle(),
): LinkedInPostParts {
  let hook = parts.hook.trim();
  let body = parts.body.trim();
  let ps = parts.ps?.trim() || undefined;

  if (countLinkedInPostParts({ hook, body, ps }) <= maxChars) {
    return { hook, body, ps };
  }

  const hookLen = () => countLinkedInCharacters(hook);
  const psLen = () => (ps ? countLinkedInCharacters(ps) + 2 : 0);
  const sep = 2;

  const maxBody =
    maxChars - hookLen() - psLen() - (hook && body ? sep : 0) - (body && ps ? sep : 0);

  if (maxBody > 80) {
    body = trimEndToCharLimit(body, maxBody);
  } else {
    body = truncateToLinkedInLimit(body, Math.max(40, maxBody));
  }

  if (countLinkedInPostParts({ hook, body, ps }) <= maxChars) {
    return { hook, body, ps };
  }

  if (ps) {
    const maxPs =
      maxChars - hookLen() - countLinkedInCharacters(body) - sep * 2;
    ps = maxPs > 20 ? trimEndToCharLimit(ps, maxPs) : undefined;
  }

  if (countLinkedInPostParts({ hook, body, ps }) <= maxChars) {
    return { hook, body, ps };
  }

  const maxHook = maxChars - countLinkedInCharacters(body) - (ps ? countLinkedInCharacters(ps) + sep : 0) - sep;
  hook = maxHook > 30 ? trimEndToCharLimit(hook, maxHook) : truncateToLinkedInLimit(hook, Math.max(20, maxHook));

  return { hook, body, ps };
}

export const LINKEDIN_LENGTH_PROMPT_RULE = `- LinkedIn composer hard limit: ${LINKEDIN_POST_CHARACTER_LIMIT} characters total for the published post (hook + body + PS + CTA + hashtags). Hook + body + PS together MUST stay under ${LINKEDIN_POST_CHARACTER_LIMIT - LINKEDIN_CTA_AND_TAGS_RESERVE} characters — never exceed this. Prefer shorter, punchier posts over long walls of text.`;
