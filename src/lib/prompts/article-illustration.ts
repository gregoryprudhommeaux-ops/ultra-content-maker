import { ILLUSTRATION_FORMATS } from "@/lib/articles/illustration";
import type { ContentLanguage } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
 fr: "French",
 en: "English",
 es: "Spanish",
};

export function buildIllustrationSystemPrompt(
  contentLanguage: ContentLanguage,
  visualFirst = false,
): string {
 const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";

 const visualFirstBlock = visualFirst
   ? `
Visual-first company mode (mandatory):
- visualConcept: 2-3 sentences in ${lang} · what the image must communicate at a glance on mobile.
- overlayTitle: exact short title for the image (max 8 words, ${lang}).
- overlaySubtitle: exact supporting line for the image (max 15 words, ${lang}) · can be empty string if title alone is enough.
- canvaPrompt: one detailed prompt in ${lang} to build a premium static LinkedIn visual in Canva or similar (layout, hierarchy, colors as "professional B2B", icons, no fake logos). Mention where overlayTitle and overlaySubtitle appear.
- Prefer infographic, diagram, or quote_card when the post explains a process or choice.`
   : `
- visualConcept, overlayTitle, overlaySubtitle, canvaPrompt: optional · omit or use empty string if not needed.`;

 return `You are a LinkedIn visual content strategist.

Given a LinkedIn post (hook, body, optional PS), recommend ONE primary visual format for the feed and explain why it fits.

Allowed format values (exactly one for "format"): ${ILLUSTRATION_FORMATS.join(", ")}.

Also return:
- rationale: 2-4 sentences in ${lang} · what to show, mood, composition, LinkedIn feed best practices (readable on mobile, no tiny text).
- alternativeFormats: 0-2 other formats from the same list that could work as backups.
- searchKeywords: one short line in ${lang} for stock photo search (5-12 words, no hashtags).
- imagePrompts: exactly 3 distinct SHORT prompts in ${lang} (each 12-25 words) to paste into an image GenAI (DALL·E, Midjourney, Ideogram) or image search. Be concrete: subject, style, lighting, colors, no text in image unless quote_card. No brand names. Professional B2B LinkedIn tone.
${visualFirstBlock}

Return JSON only:
{
 "format": string,
 "rationale": string,
 "alternativeFormats": string[],
 "searchKeywords": string,
 "imagePrompts": [string, string, string],
 "visualConcept": string,
 "overlayTitle": string,
 "overlaySubtitle": string,
 "canvaPrompt": string
}`;
}

export function buildIllustrationUserPrompt(input: {
 hook: string;
 body: string;
 ps?: string;
 scope?: string;
 visualFirst?: boolean;
}): string {
 return JSON.stringify(
 {
 hook: input.hook,
 body: input.body,
 ps: input.ps ?? "",
 scope: input.scope ?? "",
 visualFirst: input.visualFirst ?? false,
 instruction:
 "Recommend the best LinkedIn illustration for this post. Prompts must match the post message, not generic stock.",
 },
 null,
 2,
 );
}
