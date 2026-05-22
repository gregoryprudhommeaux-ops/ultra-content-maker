import type { ContentLanguage, PostBrief } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function buildFormatPlanSystemPrompt(contentLanguage: ContentLanguage): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";

  return `You are a LinkedIn content strategist (${lang}). Recommend the best NATIVE format for publishing this post on LinkedIn in 2026.

Allowed primaryFormat values ONLY:
- text_post — strong written hook + body, no carousel needed
- carousel — topic benefits from 5-7 slide PDF/document (framework, steps, comparison, listicle)
- short_video — topic fits 45-90s talking-head or b-roll with clear script beats

Rules:
- Prefer carousel when the post is structured (steps, framework, before/after, data breakdown).
- Prefer short_video when personal story, emotion, or demonstration beats text.
- Prefer text_post when the hook + insight stand alone and slides would dilute.
- rationale in ${lang}, 2-3 sentences, specific to this post.
- alternativeFormats: 0-2 other allowed values as backups.

Return JSON only:
{
  "primaryFormat": "text_post" | "carousel" | "short_video",
  "rationale": string,
  "alternativeFormats": string[]
}`;
}

export function buildFormatPlanUserPrompt(input: {
  hook: string;
  body: string;
  ps?: string;
  postBrief?: PostBrief;
  personaExcerpt: string;
}): string {
  return JSON.stringify(
    {
      hook: input.hook,
      body: input.body,
      ps: input.ps ?? "",
      postBrief: input.postBrief ?? null,
      personaExcerpt: input.personaExcerpt.slice(0, 6000),
    },
    null,
    2,
  );
}
