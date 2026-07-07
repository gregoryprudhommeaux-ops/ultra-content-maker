import { serializeSourcesForPersona } from "@/lib/workspace/serialize-sources";
import {
  buildPersonaArchetypeInstruction,
  resolveContentArchetype,
} from "@/lib/persona/content-archetype";
import type {
 AudienceProfile,
 AuthorProfile,
 ContentLanguage,
 ProfileEnrichment,
 SourceLink,
} from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, { name: string; posts: string }> = {
 fr: {
 name: "French",
 posts: "French",
 },
 en: {
 name: "English",
 posts: "English",
 },
 es: {
 name: "Spanish",
 posts: "Spanish",
 },
};

export function buildPersonaSystemPrompt(personaLanguage: ContentLanguage): string {
  const { name, posts } = LANGUAGE_LABELS[personaLanguage] ?? LANGUAGE_LABELS.en;

  return `You are a senior B2B LinkedIn strategist and prompt engineer.

Produce a single long expert system prompt (markdown) that another LLM will use to write LinkedIn posts AS the author FOR the audience described.

The prompt must be:
- Specific, actionable, and structured with clear sections (role, author context, audience, voice, structure, hooks, topics to emphasize/avoid, formatting, anti-patterns).
- Long enough to be production-ready (aim for 1500-4000 words if information allows).
- Written entirely in ${name} (the expert prompt itself · all section titles and instructions).
- All LinkedIn posts generated with this prompt must be written in ${posts}.
- Calibrated to the author's content archetype (see contentArchetype in user JSON, or infer from role/positioning/website): expert | founder_product | hybrid.

REQUIRED markdown sections inside promptText (exact headings in ${name}):
## Topic DNA
- 3 to 5 content pillars (recurring themes LinkedIn should associate with this author)
- 2 to 3 belief statements (what the author defends or challenges in the market)
- Off-topic list (what to refuse · dilutes niche authority)
- For founder_product or hybrid: include product/category mention policy (when to name the product, ratio insight vs product proof)

## LinkedIn operating rules (2026)
- Voice rule depends on archetype (expert: how we think > what we sell · founder_product: problem-first, product as proof not pitch · hybrid: balance both)
- Native formats preference (text, document/carousel outline, short video · no external links in post body)
- Proof policy: what counts as credible proof for this author (cases, metrics, field notes, customer outcomes, build notes)
- Anti-patterns: generic AI tone, engagement bait, vague inspiration, politics/insults even as humor, LinkedIn influencer templates, fake client anecdotes ("Sunday night a client called me in panic"), numbered life-lesson lists, dramatic scene-setting without real proof, product brochure / feature dump posts (especially for founders)
- Engagement goal: qualified comments and saves over vanity likes

Also return gapQuestions: 6 to 10 interactive questions to fill missing profile info. EVERY label, hint, and option must be in ${name}.

gapQuestions rules:
- id: stable snake_case identifier (e.g. sectors, company_size, cta_preference, content_archetype)
- field: "author" | "audience" | "enrichment" (use enrichment when no direct profile field)
- profileKey: Firestore field name (author: roleTitle, positioningLine, contentArchetype; audience: targetLabel, contentFocus, optionalNotes; enrichment: any snake_case key)
- type: "single" (one choice), "multi" (checkboxes), "rank" (order all options by priority), or "text" (free input)
- options: required for single/multi/rank, 3-8 concise choices in ${name}
- label: short question in ${name}
- hint: optional helper in ${name}

Prioritize gaps that would materially improve LinkedIn content: sectors, ICP size, markets, quarterly LinkedIn goal (enrichment key linkedin_quarterly_goal · MUST use type "rank" with 4-6 goal options to order by priority), proof/case study policy (proof_policy), preferred CTA style (cta_preference: comment_prompt | dm | save), posting frequency, topics to avoid.
- If contentArchetype is missing or unclear, include one gap question (enrichment key content_archetype, type single) with options EXACTLY ["expert", "founder_product", "hybrid"] (localized label/hint · slugs stay English).

When the user provides inspirationPosts or inspirationProfiles, weave them into the expert prompt as explicit creative references (not plagiarism): mirror the ASPECTS they marked (tone, angle, subject, approach, content, format) and optional whyLike notes. Never copy text from URLs. myPosts define the author's own voice baseline; inspirations are external models to borrow structure and energy from.

Return JSON only:
{
 "promptText": string,
 "gapQuestions": [ { "id", "field", "profileKey", "label", "hint?", "type", "options?" } ]
}`;
}

export function buildPersonaUserPrompt(
 author: AuthorProfile | null,
 audience: AudienceProfile | null,
 sources: SourceLink[],
 contentLanguage: ContentLanguage,
 enrichment?: ProfileEnrichment | null,
 bioReferenceDocuments?: { label: string; kind: string; sourceUrl?: string; text: string }[],
): string {
  const labels = LANGUAGE_LABELS[contentLanguage] ?? LANGUAGE_LABELS.en;
  const { myPosts, inspirationPosts, inspirationProfiles } =
    serializeSourcesForPersona(sources);
  const archetype = resolveContentArchetype({
    author,
    profileEnrichment: enrichment?.details,
  });

  return JSON.stringify(
    {
      contentLanguage,
      personaLanguage: contentLanguage,
      personaLanguageName: labels.name,
      contentArchetype: archetype,
      contentArchetypeInstruction: buildPersonaArchetypeInstruction(
        archetype,
        labels.name,
        enrichment?.details,
      ),
      author: author ?? {},
 audience: audience?.skipped ? { skipped: true } : (audience ?? {}),
 profileEnrichment: enrichment?.details ?? {},
 bioReferenceDocuments: bioReferenceDocuments ?? [],
 myPosts,
 inspirationPosts,
 inspirationProfiles,
 note: "URLs are references only; page content was not scraped. Infer carefully from URL paths and types. Use profileEnrichment as confirmed facts. bioReferenceDocuments contain extracted text from CVs, bios, PDFs, or shared Google Docs — treat as high-trust background. For each inspiration, honor likedAspects and whyLike when present.",
 },
 null,
 2,
 );
}

/** @deprecated Use buildPersonaSystemPrompt(contentLanguage) */
export const PERSONA_SYSTEM_PROMPT = buildPersonaSystemPrompt("en");
