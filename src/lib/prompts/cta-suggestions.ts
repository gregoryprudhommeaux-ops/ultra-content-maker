import type { ContentLanguage, CtaIntensity } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

const STYLE_LABELS: Record<CtaIntensity, string> = {
  soft: "soft / gentle (doux) — invite without pressure",
  medium: "medium — clear ask, professional",
  pushy: "pushy / direct — strong urgency, still credible for B2B",
};

export function buildCtaSuggestionsSystemPrompt(contentLanguage: ContentLanguage): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";

  return `You write LinkedIn post signature CTAs in ${lang} for a B2B author.

Given the Persona, post content, and profile context, produce exactly 3 CTA variants:
1. soft — ${STYLE_LABELS.soft}
2. medium — ${STYLE_LABELS.medium}
3. pushy — ${STYLE_LABELS.pushy}

Each CTA: 1-3 short lines max, fits after the post body. No hashtag spam. Optional linkUrl only if clearly inferable from context (else omit).

Return JSON only:
{
  "suggestions": [
    { "style": "soft" | "medium" | "pushy", "text": string, "linkUrl": string or omit }
  ]
}`;
}

export function buildCtaSuggestionsUserPrompt(input: {
  personaPromptText: string;
  hook: string;
  body: string;
  ps?: string;
  profileEnrichment?: Record<string, unknown>;
}): string {
  return JSON.stringify(
    {
      post: { hook: input.hook, body: input.body, ps: input.ps ?? "" },
      personaPromptText: input.personaPromptText.slice(0, 12000),
      profileEnrichment: input.profileEnrichment ?? {},
    },
    null,
    2,
  );
}
