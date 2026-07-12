import { buildContentNichePromptBlock, resolveContentNicheFromSteering } from "@/lib/articles/content-niche";
import { LINKEDIN_HASHTAG_COUNT } from "@/lib/linkedin/hashtags";
import { resolveContentArchetype } from "@/lib/persona/content-archetype";
import {
  injectAuthorSteering,
  type AuthorSteeringPayload,
} from "@/lib/profile/author-steering-context";
import { buildPostBriefPromptContext } from "@/lib/persona/company-enrichment";
import {
  buildOrganizationPromptBlock,
  buildPublishedTopicsAvoidanceBlock,
  buildEditorialCalendarPromptBlock,
  parseEditorialPillars,
  parseOrganizationProfile,
} from "@/lib/persona/organization-enrichment";
import type { ArticleScope, ContentLanguage, EmojiLevel, GapAnswerValue, PostBrief } from "@/types/workspace";
import { buildPostBriefInstruction } from "./post-brief";
import { emojiInstruction } from "./emoji-instruction";
import { buildLinkedIn2026SystemRules } from "./linkedin-2026-rules";
import { languageLabel, languageOnlyRule } from "./language-consistency";

function enrichmentDetails(
  raw?: Record<string, unknown> | null,
): Record<string, GapAnswerValue> | null | undefined {
  return raw as Record<string, GapAnswerValue> | null | undefined;
}

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
 fr: "French",
 en: "English",
 es: "Spanish",
};

export type ArticleGenerateCount = 1 | 2 | 4;

function scopeMixInstruction(
 count: ArticleGenerateCount,
 forcedScope?: ArticleScope,
): {
 systemLines: string;
 userMix: { generalist: number; niche: number };
 userInstruction: string;
} {
 if (count === 1) {
 if (forcedScope) {
 const scopeLine =
 forcedScope === "niche"
 ? 'scope "niche" · deep vertical/ICP-specific angle from the content niche anchor'
 : 'scope "generalist" · broader within expertise, still credible in the author\'s domain';
 return {
 systemLines: `- Single post: ${scopeLine}. Return scope "${forcedScope}".
- Match content to the CONTENT NICHE ANCHOR in the user message.`,
 userMix: { generalist: forcedScope === "generalist" ? 1 : 0, niche: forcedScope === "niche" ? 1 : 0 },
 userInstruction: `Generate exactly 1 post now with scope "${forcedScope}".`,
 };
 }
 return {
 systemLines: `- Single post: choose the strongest angle from the Persona and brief (scope "generalist" OR "niche" · pick one and match the content).
- Return exactly one article with the correct scope field.`,
 userMix: { generalist: 0, niche: 0 },
 userInstruction: "Generate exactly 1 post now with the best-fitting scope for the brief.",
 };
 }

 if (count === 2) {
 return {
 systemLines: `- Post 1: scope "generalist" · broad business/leadership angle, readable by any professional in the author's domain.
- Post 2: scope "niche" · deep vertical/ICP-specific angle (sector tactics, expert jargon, concrete pain points from the Persona). Must feel clearly more specialized than post 1.
- Return articles in that order. Each scope field must match the post content.
- Vary format between the two: e.g. insight vs practical how-to.`,
 userMix: { generalist: 1, niche: 1 },
 userInstruction:
 "Generate exactly 2 posts now: articles[0] scope generalist, articles[1] scope niche.",
 };
 }

 return {
 systemLines: `- Posts 1 and 2: scope "generalist" · broad business/leadership angles, readable by any professional in the author's domain (minimal jargon, universal lesson). Must feel clearly broader than posts 3–4.
- Posts 3 and 4: scope "niche" · deep vertical/ICP-specific angle (sector tactics, expert jargon, concrete pain points from the Persona). Must feel clearly more specialized than posts 1–2.
- Return articles in that order. Each scope field must match the post content.
- Within each pair, vary format: story, insight, contrarian take, or practical how-to.`,
 userMix: { generalist: 2, niche: 2 },
 userInstruction:
 "Generate exactly 4 posts now: articles[0-1] scope generalist, articles[2-3] scope niche.",
 };
}

export function buildArticlesSystemPromptWithCount(
  contentLanguage: ContentLanguage,
  count: ArticleGenerateCount,
  emojiLevel: EmojiLevel = "light",
  targetScope?: ArticleScope,
  profileEnrichment?: Record<string, unknown>,
  authorSteering?: AuthorSteeringPayload | null,
): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
  const emoji = emojiInstruction(emojiLevel, contentLanguage);
  const archetype = resolveContentArchetype({
    author: authorSteering?.author ?? null,
    profileEnrichment: profileEnrichment ?? authorSteering?.profileEnrichment ?? null,
  });
  const enrichment = enrichmentDetails(profileEnrichment ?? authorSteering?.profileEnrichment);
  const orgProfile = parseOrganizationProfile(enrichment);
  const orgBlock = buildOrganizationPromptBlock(enrichment);
  const publishedBlock = buildPublishedTopicsAvoidanceBlock(enrichment);
  const calendarBlock = buildEditorialCalendarPromptBlock(enrichment);
  const visualFirstRule =
    (archetype === "founder_product" || archetype === "hybrid") && orgProfile.visualFirst !== false
      ? "\n- Company mode · visual-first: keep each post SHORT (hook + body roughly 600-900 characters total) · one clear idea · detail lives in the feed image, not in long paragraphs."
      : "";
  const orgRules = [orgBlock, publishedBlock, calendarBlock].filter(Boolean).join("\n\n");
  const pillars = parseEditorialPillars(enrichment);
  const pillarFieldRule =
    pillars.length > 0
      ? `\n- Each post MUST include "editorialPillarId" — exact slug from: ${pillars.map((p) => `"${p.id}" (${p.label})`).join(", ")} · pick the best-matching pillar for the post angle.`
      : "";
  const pillarJsonField = pillars.length > 0 ? ', "editorialPillarId": string' : "";
  const mix =
 count === 1
 ? targetScope
 ? `one post (scope: ${targetScope})`
 : "one post (generalist OR niche · best fit)"
 : count === 2
 ? "1 generalist + 1 niche"
 : "2 generalist + 2 niche";
 const { systemLines } = scopeMixInstruction(count, targetScope);

 return `You are a senior LinkedIn B2B content strategist and ghostwriter. Follow the expert Persona system prompt provided by the user.

${buildLinkedIn2026SystemRules(contentLanguage, archetype)}
${orgRules ? `\n${orgRules}\n` : ""}${visualFirstRule ? `\n${visualFirstRule}\n` : ""}

${languageOnlyRule(contentLanguage)}

Write exactly ${count} distinct LinkedIn posts in ${lang} · mandatory mix: ${mix} (no other ratio).
${systemLines}
- Each post: strong hook (1-2 lines), body with line breaks for LinkedIn readability, optional short PS before CTA (user adds CTA later · do NOT include newsletter links or hard sell CTA blocks).
- Never paste https://www.linkedin.com/ or other generic LinkedIn platform URLs in hook, body, or PS (no homepage / feed links).
- When objective is conversation: end body with a specific question for the target ICP (not engagement bait). Do not write a full signature CTA or duplicate conditional opener · a separate CTA block is added later; leave room for one clear next step.
- Emoji rule (non-negotiable): ${emoji}
- Match author voice and audience from the Persona strictly.
- If the Persona says "no emojis" but emojiLevel is light or heavy, follow emojiLevel · user choice overrides.
- For each post, add exactly ${LINKEDIN_HASHTAG_COUNT} LinkedIn hashtags in "hashtags" (strings without #): relevant to post content, author niche and audience from the Persona. Mix specific + broader tags. No generic spam.${pillarFieldRule}

Return JSON only:
{
 "articles": [
 { "hook": string, "body": string, "ps": string or empty string, "scope": "generalist" | "niche", "hashtags": string[]${pillarJsonField} }
 ]
}`;
}

export function buildArticlesUserPromptWithCount(
 personaPromptText: string,
 contentLanguage: ContentLanguage,
 count: ArticleGenerateCount,
 profileEnrichment?: Record<string, unknown>,
 emojiLevel: EmojiLevel = "light",
 postBrief?: PostBrief,
 authorSteering?: AuthorSteeringPayload | null,
 targetScope: ArticleScope = "generalist",
): string {
 const emojiRule = emojiInstruction(emojiLevel, contentLanguage);
 const { userMix, userInstruction } = scopeMixInstruction(count, count === 1 ? targetScope : undefined);
 const emojiSuffix =
 emojiLevel === "none"
 ? " No emojis."
 : " Every post MUST include visible Unicode emojis per emojiRule. Verify scope mix before responding.";

 const briefContext = buildPostBriefPromptContext({
 author: authorSteering?.author ?? null,
 profileEnrichment: profileEnrichment ?? authorSteering?.profileEnrichment ?? null,
 authorSteering,
 });
 const briefBlock = postBrief
 ? buildPostBriefInstruction(postBrief, contentLanguage, briefContext)
 : undefined;

 const nicheLine = resolveContentNicheFromSteering(personaPromptText, authorSteering);
 const nicheBlock =
 count === 1 ? buildContentNichePromptBlock(nicheLine, targetScope) : undefined;
 const contentArchetype = resolveContentArchetype({
 author: authorSteering?.author ?? null,
 profileEnrichment: profileEnrichment ?? authorSteering?.profileEnrichment ?? null,
 });
 const enrichment = enrichmentDetails(profileEnrichment ?? authorSteering?.profileEnrichment);
 const orgBlock = buildOrganizationPromptBlock(enrichment);
 const publishedBlock = buildPublishedTopicsAvoidanceBlock(enrichment);
 const calendarBlock = buildEditorialCalendarPromptBlock(enrichment);

 return JSON.stringify(
 injectAuthorSteering(
 {
 contentLanguage,
 contentArchetype,
 emojiLevel,
 emojiRule,
 personaPromptText,
 profileEnrichment: profileEnrichment ?? {},
 organizationContext: orgBlock ?? null,
 publishedTopicsAvoidance: publishedBlock ?? null,
 editorialCalendarContext: calendarBlock ?? null,
 postBrief: postBrief ?? null,
 postBriefInstruction: briefBlock ?? null,
 contentNicheInstruction: nicheBlock ?? null,
 requiredScopeMix: userMix,
 instruction: `${userInstruction}${emojiSuffix}${nicheBlock ? `\n\n${nicheBlock}` : ""}${briefBlock ? `\n\n${briefBlock}` : ""}`,
 },
 authorSteering,
 ),
 null,
 2,
 );
}

export function buildArticlesSystemPrompt(
 contentLanguage: ContentLanguage,
 emojiLevel: EmojiLevel = "light",
): string {
 return buildArticlesSystemPromptWithCount(contentLanguage, 4, emojiLevel);
}

export function buildArticlesUserPrompt(
 personaPromptText: string,
 contentLanguage: ContentLanguage,
 profileEnrichment?: Record<string, unknown>,
 emojiLevel: EmojiLevel = "light",
 authorSteering?: AuthorSteeringPayload | null,
): string {
 return buildArticlesUserPromptWithCount(
 personaPromptText,
 contentLanguage,
 4,
 profileEnrichment,
 emojiLevel,
 undefined,
 authorSteering,
 );
}
