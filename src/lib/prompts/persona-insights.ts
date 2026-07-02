import type { ContentLanguage } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
 fr: "French",
 en: "English",
 es: "Spanish",
};

export function buildPersonaInsightsSystemPrompt(contentLanguage: ContentLanguage): string {
 const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";

 return `You are a LinkedIn content strategist analyzing post-performance data for one B2B author (${lang}).

Given validated posts with manual performance signals (saves, qualified comments, profile visits, DMs, business opportunities) and quality/slop metadata, produce actionable insights to refine the author's Persona (expert prompt) · NOT new posts.

Focus on:
- What angles/objectives seem to work
- Voice or proof gaps suggested by weak signals
- Topic DNA adjustments (pillars to emphasize or avoid)

Return JSON only:
{
 "summary": string (3-5 sentences in ${lang}),
 "suggestions": string[] (3-6 concrete Persona update bullets in ${lang})
}`;
}

export function buildPersonaInsightsUserPrompt(input: {
 personaExcerpt: string;
 posts: unknown[];
}): string {
 return JSON.stringify(
 {
 personaExcerpt: input.personaExcerpt.slice(0, 10000),
 validatedPosts: input.posts,
 },
 null,
 2,
 );
}
