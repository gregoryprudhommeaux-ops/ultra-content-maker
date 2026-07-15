import { buildHumanWritingRules } from "@/lib/articles/human-writing";
import { isCorrosiveToneEdge } from "@/lib/articles/refinement";
import { buildAntiAiHumanizerGenerationHints } from "@/lib/prompts/anti-ai-humanizer";
import { buildAntiLinkedInSlopRules } from "@/lib/prompts/anti-linkedin-slop";
import { buildToneEdgeInstruction } from "@/lib/prompts/tone-edge";
import { buildNewsSourceInPostInstruction } from "@/lib/prompts/news-source-citation";
import { buildPostBriefPromptContext } from "@/lib/persona/company-enrichment";
import { buildPostBriefInstruction } from "@/lib/prompts/post-brief";
import {
 injectAuthorSteering,
 slimAuthorSteeringForRevise,
 type AuthorSteeringPayload,
} from "@/lib/profile/author-steering-context";
import type {
 ArticleNewsSource,
 ArticleRefinement,
 ContentLanguage,
 EmojiLevel,
 PostBrief,
} from "@/types/workspace";
import { emojiInstruction } from "./emoji-instruction";
import { languageOnlyRule } from "./language-consistency";

const REVISE_PERSONA_MAX_CHARS = 3_500;

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
 fr: "French",
 en: "English",
 es: "Spanish",
};

export function buildReviseSystemPrompt(
 contentLanguage: ContentLanguage,
 emojiLevel: EmojiLevel = "light",
 corrosiveTone = false,
 personalVoice = false,
): string {
 const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
 const emoji = emojiInstruction(emojiLevel, contentLanguage);
 const toneNote = corrosiveTone
 ? " User requested a contrarian shift (challenge received idea or news angle only). Apply toneEdgeInstruction as top priority. Strictly forbid insults, politics, racism, hate, and offensive humor · professional B2B only."
 : "";
 const personalNote = personalVoice
 ? " Keep FIRST PERSON throughout. This is a personal milestone post · do not shift to journalist or thought-leadership tone. Preserve the author's story and facts."
 : "";

 return `You revise a LinkedIn post using the expert Persona and user refinement feedback.

${languageOnlyRule(contentLanguage)}
${buildAntiLinkedInSlopRules(contentLanguage)}
${buildHumanWritingRules(contentLanguage)}
${buildAntiAiHumanizerGenerationHints(contentLanguage)}

Keep the post in ${lang}. Preserve author expertise. Apply all feedback.${toneNote}${personalNote}
Emoji rule (non-negotiable): ${emoji}
If emojiLevel is light or heavy, the revised post MUST contain visible Unicode emojis.

Closing: end the body so a signature CTA can follow naturally · avoid repeating the same conditional opener the CTA will use; do not paste a hard-sell CTA block into the body.

CRITICAL: Reply with a single valid JSON object only · no markdown fences, no commentary before or after.

Return JSON only: { "hook": string, "body": string, "ps": string, "scope": "generalist" | "niche", "hashtags": string[] } with exactly 4 hashtags (no # prefix). Keep the same scope unless refinement clearly requires switching breadth.`;
}

export function buildReviseUserPrompt(
 personaPromptText: string,
 article: { hook: string; body: string; ps?: string },
 refinement: ArticleRefinement,
 contentLanguage: ContentLanguage,
 newsSource?: ArticleNewsSource,
 authorSteering?: AuthorSteeringPayload | null,
 postBrief?: PostBrief,
): string {
 const toneEdgeInstruction = buildToneEdgeInstruction(
 contentLanguage,
 refinement.toneEdge,
 );

 const briefContext = buildPostBriefPromptContext({
 author: authorSteering?.author ?? null,
 profileEnrichment: authorSteering?.profileEnrichment ?? null,
 authorSteering,
 });
 const postBriefInstruction =
 postBrief?.postAngle
 ? buildPostBriefInstruction(postBrief, contentLanguage, briefContext)
 : null;

 const payload: Record<string, unknown> = {
 personaPromptText: personaPromptText.slice(0, REVISE_PERSONA_MAX_CHARS),
 current: article,
 refinement,
 toneEdge: refinement.toneEdge ?? "default",
 toneEdgeInstruction,
 corrosiveToneRequested: isCorrosiveToneEdge(refinement),
 ...(postBriefInstruction ? { postBriefInstruction } : {}),
 };
 if (newsSource?.url) {
 payload.newsSourceCitation = buildNewsSourceInPostInstruction(
 contentLanguage,
 newsSource,
 );
 }
 return JSON.stringify(
 injectAuthorSteering(payload, slimAuthorSteeringForRevise(authorSteering)),
 null,
 2,
 );
}
