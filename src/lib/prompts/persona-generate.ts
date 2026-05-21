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
- Written entirely in ${name} (the expert prompt itself — all section titles and instructions).
- All LinkedIn posts generated with this prompt must be written in ${posts}.

Also return gapQuestions: 6 to 10 interactive questions to fill missing profile info. EVERY label, hint, and option must be in ${name}.

gapQuestions rules:
- id: stable snake_case identifier (e.g. sectors, company_size, cta_preference)
- field: "author" | "audience" | "enrichment" (use enrichment when no direct profile field)
- profileKey: Firestore field name (author: roleTitle, positioningLine; audience: targetLabel, contentFocus, optionalNotes; enrichment: any snake_case key)
- type: "single" (one choice), "multi" (checkboxes), or "text" (free input)
- options: required for single/multi, 3-8 concise choices in ${name}
- label: short question in ${name}
- hint: optional helper in ${name}

Prioritize gaps that would materially improve LinkedIn content (sectors, ICP size, markets, CTA style, posting frequency, case study policy, topics to avoid).

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
): string {
  const labels = LANGUAGE_LABELS[contentLanguage] ?? LANGUAGE_LABELS.en;

  return JSON.stringify(
    {
      contentLanguage,
      personaLanguage: contentLanguage,
      personaLanguageName: labels.name,
      author: author ?? {},
      audience: audience?.skipped ? { skipped: true } : (audience ?? {}),
      profileEnrichment: enrichment?.details ?? {},
      sources: sources.map((s) => ({
        type: s.type,
        url: s.url,
        label: s.label,
      })),
      note: "URLs are references only; page content was not scraped. Infer carefully from URL paths and types. Use profileEnrichment as confirmed facts.",
    },
    null,
    2,
  );
}

/** @deprecated Use buildPersonaSystemPrompt(contentLanguage) */
export const PERSONA_SYSTEM_PROMPT = buildPersonaSystemPrompt("en");
