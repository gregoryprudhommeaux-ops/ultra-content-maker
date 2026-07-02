import { extractPostEnding } from "@/lib/articles/post-ending";
import { buildAntiSlopClosingRules } from "@/lib/prompts/anti-linkedin-slop";
import {
 ctaBridgeExamples,
 languageLabel,
 languageOnlyRule,
} from "@/lib/prompts/language-consistency";
import type { ContentLanguage } from "@/types/workspace";

export function buildIntegrateCtaSystemPrompt(contentLanguage: ContentLanguage): string {
 const lang = languageLabel(contentLanguage);
 const bridges = ctaBridgeExamples(contentLanguage);

 return `You harmonize a LinkedIn B2B post ending with its signature CTA block (${lang}).

${languageOnlyRule(contentLanguage)}

Rules (non-negotiable):
- The hook and main body text are FIXED · never rewrite or return them.
- Output only "closingBlock": the text appended after the body (blank line before). It may merge an existing PS with the CTA draft into one coherent closing.
- The closingBlock must read as the natural next beat · not a pasted second introduction.
- Read postEnding carefully. Do NOT repeat its opening clause, conditional setup, audience/ICP list, sector list, study citation, or rhetorical question verbatim.
- Never restate the same target reader profile (e.g. same "PME / SME / sector" enumeration) if postEnding already named it · assume the reader and move to the next step.
- If the body already ends with a question, the closingBlock should offer the next step (DM, resource, tag, reflection) · not restart the same scenario with the same first sentence.
- Prefer short bridges (${bridges}) over duplicating the body's hook phrase or key metaphor.
- Do not re-introduce the same study, report, or source the body already mentioned unless you add one new actionable line only.
- Keep 1–4 short lines total. No hashtags. No external URLs unless present in ctaDraft.
- Preserve the intent and intensity of ctaDraft (soft / medium / pushy).
${buildAntiSlopClosingRules(contentLanguage)}

Return JSON only: { "closingBlock": string }`;
}

export function buildIntegrateCtaUserPrompt(input: {
 hook: string;
 body: string;
 ps?: string;
 ctaDraft: string;
 ctaStyle: string;
 contentLanguage: ContentLanguage;
}): string {
 return JSON.stringify(
 {
 contentLanguage: input.contentLanguage,
 hook: input.hook,
 body: input.body,
 ps: input.ps ?? "",
 postEnding: extractPostEnding(input.body, input.ps),
 ctaDraft: input.ctaDraft,
 ctaStyle: input.ctaStyle,
 instruction: `closingBlock must be 100% in ${languageLabel(input.contentLanguage)} · match the body language exactly.`,
 },
 null,
 2,
 );
}
