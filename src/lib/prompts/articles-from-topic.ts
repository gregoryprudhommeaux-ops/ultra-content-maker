import { parseArticleTopicFields } from "@/lib/articles/article-topic-fields";
import { isPersonalArticleWritingStyle } from "@/lib/articles/article-writing-style";
import { LINKEDIN_HASHTAG_COUNT } from "@/lib/linkedin/hashtags";
import { LINKEDIN_LENGTH_PROMPT_RULE } from "@/lib/linkedin/fit-linkedin-post";
import {
 injectAuthorSteering,
 type AuthorSteeringPayload,
} from "@/lib/profile/author-steering-context";
import type { ContentLanguage, EmojiLevel, PostBrief } from "@/types/workspace";
import { emojiInstruction } from "./emoji-instruction";
import { buildLinkedIn2026SystemRules } from "./linkedin-2026-rules";
import { languageOnlyRule } from "./language-consistency";
import { buildPostBriefPromptContext } from "@/lib/persona/company-enrichment";
import { buildPostBriefInstruction } from "./post-brief";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
 fr: "French",
 en: "English",
 es: "Spanish",
};

const PERSONAL_VOICE_RULES = `
Personal voice rules (non-negotiable when this mode is active):
- Write entirely in FIRST PERSON (I / je / yo) as the author sharing their own experience.
- This is NOT journalism, NOT a press release, NOT corporate thought leadership, NOT a generic LinkedIn growth post.
- Preserve the author's facts, timeline, and emotions from their draft message · do not invent achievements or credentials.
- Your role: rephrase for clarity, structure paragraphs for readability, tighten wording, suggest subtle improvements aligned with their Persona and profile · not rewrite into an expert manifesto.
- Tone: warm, honest, human · suitable for a meaningful life step (diploma, promotion, career change, personal milestone).
- Avoid AI slop and LinkedIn clichés: no "excited to announce", "humbled and grateful", "3 lessons", "game changer", "in today's fast-paced world", numbered lesson lists unless the author explicitly used them.
- No fake dramatic anecdotes the author did not write (no invented "Sunday night a client called me in panic" scenes).
- No engagement bait. Optional soft closing question only if it fits naturally.
- ${LINKEDIN_LENGTH_PROMPT_RULE}`;

export function buildTopicArticleSystemPrompt(
 contentLanguage: ContentLanguage,
 postBrief: PostBrief,
 emojiLevel: EmojiLevel = "light",
): string {
 const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
 const emoji = emojiInstruction(emojiLevel, contentLanguage);
 const personal = isPersonalArticleWritingStyle(postBrief);

 if (personal) {
 return `You are a careful writing coach helping a professional share a personal moment on LinkedIn in ${lang}.

${languageOnlyRule(contentLanguage)}
${PERSONAL_VOICE_RULES}
- Emoji rule: ${emoji}
- Return exactly ONE post. scope: "generalist".
- Add ${LINKEDIN_HASHTAG_COUNT} relevant hashtags (strings without #) · understated, not spammy.

Return JSON only:
{
 "articles": [
 { "hook": string, "body": string, "ps": string or empty string, "scope": "generalist", "hashtags": string[] }
 ]
}`;
 }

 return `You are a senior LinkedIn content strategist. The author provided an explicit topic brief · write ONE post from THEIR message, not a generic expert take.

${buildLinkedIn2026SystemRules(contentLanguage)}

${languageOnlyRule(contentLanguage)}

Write exactly 1 LinkedIn post in ${lang} from the user's topic brief.
- Anchor on their topic and core message; use Persona for voice and ICP alignment only.
- scope: "generalist" unless the brief clearly targets a narrow ICP.
- Strong hook (1-2 lines), body with line breaks, optional short PS.
- Emoji rule: ${emoji}
- Add exactly ${LINKEDIN_HASHTAG_COUNT} hashtags (strings without #).

Return JSON only:
{
 "articles": [
 { "hook": string, "body": string, "ps": string or empty string, "scope": "generalist" | "niche", "hashtags": string[] }
 ]
}`;
}

export function buildTopicArticleUserPayload(
 personaPromptText: string,
 contentLanguage: ContentLanguage,
 postBrief: PostBrief,
 emojiLevel: EmojiLevel = "light",
 authorSteering?: AuthorSteeringPayload | null,
): string {
 const fields = parseArticleTopicFields(postBrief);
 const personal = isPersonalArticleWritingStyle(postBrief);
 const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
 const emojiRule = emojiInstruction(emojiLevel, contentLanguage);

 const instruction = personal
 ? `Rephrase and structure the author's personal message in ${lang}. Stay in first person. Keep their story and facts; improve flow, clarity, and emotional honesty. Use the Persona only to align voice and suggest subtle enhancements grounded in their real profile · never turn this into a B2B thought-leadership post.`
 : `Write one LinkedIn post in ${lang} from the topic brief below. Stay faithful to the author's intent; use the Persona for voice and credibility.`;

 const briefContext = buildPostBriefPromptContext({
 author: authorSteering?.author ?? null,
 profileEnrichment: authorSteering?.profileEnrichment ?? null,
 authorSteering,
 });
 const postBriefInstruction =
 !personal && postBrief.postAngle
 ? buildPostBriefInstruction(postBrief, contentLanguage, briefContext)
 : null;

 const instructionWithBrief = postBriefInstruction
 ? `${instruction}\n\n${postBriefInstruction}`
 : instruction;

 return JSON.stringify(
 injectAuthorSteering(
 {
 contentLanguage,
 emojiLevel,
 emojiRule,
 personaPromptText,
 writingStyle: personal ? "personal_first_person" : "linkedin_topic",
 topic: fields.topic.trim(),
 coreMessage: fields.message.trim(),
 optionalExample: fields.example.trim() || null,
 optionalClosingIntention: fields.ctaHint.trim() || null,
 postBriefInstruction,
 instruction: instructionWithBrief,
 },
 authorSteering,
 ),
 null,
 2,
 );
}
