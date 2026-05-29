import { serializeSourcesForPersona } from "@/lib/workspace/serialize-sources";
import type {
  AudienceProfile,
  AuthorProfile,
  ContentLanguage,
  ProfileEnrichment,
  SourceLink,
} from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function buildPersonaRefreshSystemPrompt(
  contentLanguage: ContentLanguage,
): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
  return `You are a senior B2B LinkedIn prompt engineer.

Update an existing expert Persona prompt (markdown) using fresh profile data and optional user instructions.

Rules:
- Preserve the overall structure and validated voice; do not shorten below ~1200 words unless the source was already short.
- Integrate ALL new profile facts into the relevant sections (role, positioning, audience, Topic DNA, proof policy, etc.) — do not only append a changelog.
- Remove contradictions between old text and new profile.
- Write entirely in ${lang}.
- Do NOT include a version line (the app adds it).
- Do NOT include a "learned preferences" section (the app merges it separately).
- Return JSON only: { "promptText": string, "changeSummary": string }
  where changeSummary is 1-2 short sentences in ${lang} describing what was updated (for the user dashboard).`;
}

export function buildPersonaRefreshUserPrompt(
  currentBasePrompt: string,
  author: AuthorProfile | null,
  audience: AudienceProfile | null,
  sources: SourceLink[],
  enrichment: ProfileEnrichment | null,
  contentLanguage: ContentLanguage,
  userComment?: string,
): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
  const { myPosts, inspirationPosts, inspirationProfiles } =
    serializeSourcesForPersona(sources);

  const commentBlock = userComment?.trim()
    ? { userRefinement: userComment.trim() }
    : {};

  return JSON.stringify(
    {
      contentLanguage,
      postLanguage: lang,
      currentBasePrompt: currentBasePrompt.trim(),
      author: author ?? {},
      audience: audience?.skipped ? { skipped: true } : (audience ?? {}),
      profileEnrichment: enrichment?.details ?? {},
      myPosts,
      inspirationPosts,
      inspirationProfiles,
      ...commentBlock,
      instruction:
        "Update currentBasePrompt into a full expert Persona. Return JSON { promptText, changeSummary }.",
    },
    null,
    2,
  );
}
