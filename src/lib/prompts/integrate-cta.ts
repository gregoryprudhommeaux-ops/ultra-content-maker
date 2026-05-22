import { extractPostEnding } from "@/lib/articles/post-ending";
import type { ContentLanguage } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function buildIntegrateCtaSystemPrompt(contentLanguage: ContentLanguage): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";

  return `You harmonize a LinkedIn B2B post ending with its signature CTA block (${lang}).

Rules (non-negotiable):
- The hook and main body text are FIXED — never rewrite or return them.
- Output only "closingBlock": the text appended after the body (blank line before). It may merge an existing PS with the CTA draft into one coherent closing.
- The closingBlock must read as the natural next beat — not a pasted second introduction.
- Read postEnding carefully. Do NOT repeat its opening clause, conditional setup ("If you…"), or rhetorical question verbatim.
- If the body already ends with a question, the closingBlock should offer the next step (DM, resource, tag, reflection) — not restart the same scenario with the same first sentence.
- Prefer short bridges ("Pour aller plus loin", "Dans ce cas", "Si c'est votre situation") over duplicating the body's hook phrase.
- Keep 1–4 short lines total. No hashtags. No external URLs unless present in ctaDraft.
- Preserve the intent and intensity of ctaDraft (soft / medium / pushy).

Return JSON only: { "closingBlock": string }`;
}

export function buildIntegrateCtaUserPrompt(input: {
  hook: string;
  body: string;
  ps?: string;
  ctaDraft: string;
  ctaStyle: string;
}): string {
  return JSON.stringify(
    {
      hook: input.hook,
      body: input.body,
      ps: input.ps ?? "",
      postEnding: extractPostEnding(input.body, input.ps),
      ctaDraft: input.ctaDraft,
      ctaStyle: input.ctaStyle,
    },
    null,
    2,
  );
}
