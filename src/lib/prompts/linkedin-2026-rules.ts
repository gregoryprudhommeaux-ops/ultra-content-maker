import { buildHumanWritingRules } from "@/lib/articles/human-writing";
import { LINKEDIN_LENGTH_PROMPT_RULE } from "@/lib/linkedin/fit-linkedin-post";
import { buildLinkedInArchetypeRules, resolveContentArchetype } from "@/lib/persona/content-archetype";
import { buildAntiAiHumanizerGenerationHints } from "@/lib/prompts/anti-ai-humanizer";
import { buildAntiLinkedInSlopRules } from "@/lib/prompts/anti-linkedin-slop";
import { AUTHOR_STEERING_PROMPT_RULE } from "@/lib/profile/author-steering-context";
import type { ContentArchetype, ContentLanguage } from "@/types/workspace";

/** Shared LinkedIn-native writing rules (2026 authority content). */
export function buildLinkedIn2026SystemRules(
  contentLanguage: ContentLanguage,
  archetype?: ContentArchetype,
): string {
  const resolved = archetype ?? "expert";
  return `
LinkedIn 2026 rules (non-negotiable):
${LINKEDIN_LENGTH_PROMPT_RULE}
${AUTHOR_STEERING_PROMPT_RULE}
${buildAntiLinkedInSlopRules(contentLanguage)}
${buildHumanWritingRules(contentLanguage)}
${buildAntiAiHumanizerGenerationHints(contentLanguage)}
${buildLinkedInArchetypeRules(resolved)}
- Language: apply all anti-AI-slop rules in the output language only (fr / en / es) · for Spanish, respect Mexico vs Spain filters when geography/Persona implies it.
- Uneven information density + certainty hedges + sharp verbs · never uniformly polished "perfect AI" prose.
- Niche-specific: write for the defined ICP, not "everyone on LinkedIn".
- Include at least one concrete proof element per post when available in brief/Persona (case, metric, field observation · no vague inspiration; never invent proof).
- No engagement bait ("agree?", "like if", "comment YES").
- Do NOT put external http(s) links in hook, body, or ps · user adds links in comments if needed.
- Prefer line breaks for feed readability; end with substance that invites thoughtful comments when objective is conversation.
- Optimize for saves, qualified comments, and profile visits · not vanity likes.
- After drafting mentally: if the post would vanish in an AI-saturated feed, rewrite before outputting JSON.`;
}

/** Resolve archetype from optional steering payload fields. */
export function linkedInRulesArchetypeFromInput(input?: {
  authorSteering?: { author?: { contentArchetype?: ContentArchetype }; profileEnrichment?: Record<string, unknown> };
  profileEnrichment?: Record<string, unknown>;
  author?: { contentArchetype?: ContentArchetype; roleTitle?: string; positioningLine?: string };
}): ContentArchetype {
  return resolveContentArchetype({
    author: input?.authorSteering?.author ?? input?.author ?? null,
    profileEnrichment:
      input?.authorSteering?.profileEnrichment ?? input?.profileEnrichment ?? null,
  });
}

/** @deprecated Use buildLinkedIn2026SystemRules(contentLanguage) · kept for imports that lack language context. */
export const LINKEDIN_2026_SYSTEM_RULES = buildLinkedIn2026SystemRules("en");
