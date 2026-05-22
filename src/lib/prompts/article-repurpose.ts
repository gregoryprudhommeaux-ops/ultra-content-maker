import type { ContentLanguage, PostBrief } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function buildRepurposeSystemPrompt(contentLanguage: ContentLanguage): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";

  return `You repurpose a validated LinkedIn text post into native LinkedIn formats (${lang}).

Output TWO deliverables from the SAME angle (do not change the core POV or proof):

1) carousel — 5 to 7 slides for a LinkedIn PDF carousel:
   - Each slide: title (max 8 words) + 2-4 short bullets
   - Slide 1 = hook, last slide = takeaway + soft question (no engagement bait)
   - designNotes: 1 sentence layout tip

2) videoScript — 45-90 second short native video:
   - hookLine (first 3 seconds)
   - 3-5 segments with label + spoken script
   - closingLine with optional CTA tone (no hard sell)
   - totalDurationSec estimate

Keep language ${lang}. No external links in scripts.

Return JSON only:
{
  "carousel": { "slides": [{ "title": string, "bullets": string[] }], "designNotes": string },
  "videoScript": {
    "hookLine": string,
    "segments": [{ "label": string, "script": string, "durationSec": number }],
    "closingLine": string,
    "totalDurationSec": number
  }
}`;
}

export function buildRepurposeUserPrompt(input: {
  hook: string;
  body: string;
  ps?: string;
  exportText?: string;
  postBrief?: PostBrief;
  personaExcerpt: string;
}): string {
  return JSON.stringify(
    {
      hook: input.hook,
      body: input.body,
      ps: input.ps ?? "",
      exportText: input.exportText ?? null,
      postBrief: input.postBrief ?? null,
      personaExcerpt: input.personaExcerpt.slice(0, 8000),
    },
    null,
    2,
  );
}
