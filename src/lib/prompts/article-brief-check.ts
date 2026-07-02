import { buildAntiLinkedInSlopRules } from "@/lib/prompts/anti-linkedin-slop";
import {
 injectAuthorSteering,
 type AuthorSteeringPayload,
} from "@/lib/profile/author-steering-context";
import type { ContentLanguage, PostBrief } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
 fr: "French",
 en: "English",
 es: "Spanish",
};

export function buildBriefCheckSystemPrompt(contentLanguage: ContentLanguage): string {
 const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";

 return `You evaluate whether a LinkedIn post brief is niche-specific enough for B2B authority content (${lang}).

${buildAntiLinkedInSlopRules(contentLanguage)}

Score 1-10:
- 9-10: clear ICP, sector, problem, POV, concrete proof grounded in Persona · no fake anecdote setup
- 5-6: understandable but could apply to many audiences
- 1-4: generic inspiration, no proof, vague POV, or reads like a LinkedIn influencer template / invented client scene

isTooGeneric = true if score <= 4 OR brief could target "any professional on LinkedIn" without edits OR proof/POV rely on a fabricated dramatic anecdote.

feedback: 2-3 sentences in ${lang} explaining the score.
suggestions: 1-3 short actionable edits (strings).

Return JSON only:
{
 "score": number,
 "isTooGeneric": boolean,
 "feedback": string,
 "suggestions": string[]
}`;
}

export function buildBriefCheckUserPrompt(
 brief: PostBrief,
 personaExcerpt: string,
 authorSteering?: AuthorSteeringPayload | null,
): string {
 return JSON.stringify(
 injectAuthorSteering(
 { postBrief: brief, personaExcerpt: personaExcerpt.slice(0, 4000) },
 authorSteering,
 ),
 null,
 2,
 );
}
