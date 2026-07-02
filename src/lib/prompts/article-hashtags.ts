import {
 injectAuthorSteering,
 type AuthorSteeringPayload,
} from "@/lib/profile/author-steering-context";
import type { ContentLanguage } from "@/types/workspace";
import { LINKEDIN_HASHTAG_COUNT } from "@/lib/linkedin/hashtags";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
 fr: "French",
 en: "English",
 es: "Spanish",
};

export function buildHashtagsSystemPrompt(contentLanguage: ContentLanguage): string {
 const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";

 return `You suggest LinkedIn hashtags for a post.
Language for tag wording: ${lang} (use labels natural on LinkedIn in that language; ASCII hashtags without accents when needed).

Rules:
- Return exactly ${LINKEDIN_HASHTAG_COUNT} hashtags.
- Mix: 2 niche/specific tags (author expertise + post topic) + 2 broader discovery tags.
- Derive from the Persona (author niche, audience, topics) and the post content · not generic spam (#motivation #success only).
- No # in JSON values (we add them on export).
- CamelCase or single words only, no spaces.

Return JSON only: { "hashtags": string[] }`;
}

export function buildHashtagsUserPrompt(input: {
 personaPromptText: string;
 contentLanguage: ContentLanguage;
 hook: string;
 body: string;
 ps?: string;
 ctaText?: string;
 profileEnrichment?: Record<string, unknown>;
 authorSteering?: AuthorSteeringPayload | null;
}): string {
 return JSON.stringify(
 injectAuthorSteering(
 {
 contentLanguage: input.contentLanguage,
 personaPromptText: input.personaPromptText,
 profileEnrichment: input.profileEnrichment ?? {},
 post: {
 hook: input.hook,
 body: input.body,
 ps: input.ps ?? "",
 ctaText: input.ctaText ?? "",
 },
 },
 input.authorSteering,
 ),
 null,
 2,
 );
}
