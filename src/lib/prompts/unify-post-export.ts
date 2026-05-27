import { LINKEDIN_2026_SYSTEM_RULES } from "@/lib/prompts/linkedin-2026-rules";
import type { ContentLanguage, CtaIntensity } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function buildUnifyPostExportSystemPrompt(
  contentLanguage: ContentLanguage,
  ctaStyle: CtaIntensity = "medium",
): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";

  return `You are a senior LinkedIn B2B editor. The main post and the signature CTA were produced in two steps and will be published as one post (${lang}).

Your job: ONE final coherence pass on the combined piece — remove semantic and phrasing repetition between body and closingBlock while preserving facts, voice, and CTA intent (${ctaStyle}).

${LINKEDIN_2026_SYSTEM_RULES}

Coherence rules (non-negotiable):
- Read hook + body + closingBlock as a single narrative arc.
- If the same audience segment, study, metaphor, or conditional setup ("Si vous êtes…", "If you are…") appears in body AND closingBlock, keep the stronger version once and rewrite the other so it advances the story (next step, DM, resource) — never duplicate lists of ICP/sector verbatim.
- If body already ends with a question, closingBlock answers with ONE clear next step — do not reopen the same scenario.
- If body cites a study/source, closingBlock must not re-introduce the same study unless adding a distinct angle in one short clause.
- closingBlock must feel like the natural next beat, not a second post pasted below.
- Prefer trimming redundancy over adding new ideas. No new facts, names, or URLs.
- hook: change only when clearly redundant with the opening of body; otherwise return unchanged.
- ps: return empty string if its content is merged into closingBlock or redundant with body.
- No hashtags in any field.

Return JSON only:
{
  "hook": string,
  "body": string,
  "ps": string,
  "closingBlock": string
}`;
}

export function buildUnifyPostExportUserPrompt(input: {
  hook: string;
  body: string;
  ps?: string;
  closingBlock: string;
  ctaStyle: CtaIntensity;
}): string {
  return JSON.stringify(
    {
      hook: input.hook,
      body: input.body,
      ps: input.ps ?? "",
      closingBlock: input.closingBlock,
      ctaStyle: input.ctaStyle,
      instruction:
        "Polish body and closingBlock for global coherence. Remove repeated messages, ideas, and stock phrases between sections. Keep hook unless it repeats the first line of body.",
    },
    null,
    2,
  );
}
