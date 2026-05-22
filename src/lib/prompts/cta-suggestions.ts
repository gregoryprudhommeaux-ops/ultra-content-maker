import { extractPostEnding } from "@/lib/articles/post-ending";
import type { ContentLanguage, CtaIntensity, PostObjective } from "@/types/workspace";

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

const OBJECTIVE_CTA_GUIDE: Record<PostObjective, string> = {
  conversation:
    "All 3 variants must invite thoughtful comments from the ICP (open questions, trade-offs) — NOT engagement bait. Vary depth: soft = gentle question, medium = clear debate prompt, pushy = direct challenge to common belief.",
  credibility:
    "Variants build authority: invite saves of a framework, ask for peer tag, or offer a resource — professional, low pressure. Vary soft/medium/pushy depth.",
  leads:
    "Variants invite DMs or contact for a relevant resource — soft/medium/pushy intensity as below.",
  awareness:
    "Variants encourage follow/profile visit or share with a peer — light touch, no hard sell.",
};

export function buildCtaSuggestionsSystemPrompt(
  contentLanguage: ContentLanguage,
  postObjective: PostObjective = "credibility",
): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
  const intentGuide = OBJECTIVE_CTA_GUIDE[postObjective];

  return `You write LinkedIn post signature CTAs in ${lang} for a B2B author.

Post objective: ${postObjective}.
${intentGuide}

Produce exactly 3 CTA variants (keep style labels for UI):
1. soft — ${STYLE_LABELS.soft}
2. medium — ${STYLE_LABELS.medium}
3. pushy — ${STYLE_LABELS.pushy}

Each CTA: 1-3 short lines max, appended after the post with a blank line — must read as the natural next beat, not a second intro.

CONTINUITY (critical):
- Study postEnding in the user message. Never repeat its opening clause, conditional setup, or rhetorical question.
- If the body already ends with a question, offer the next step (DM, resource, tag) — do not ask another question with the same "If you…" opener.
- Use bridges ("Pour aller plus loin", "Dans ce cas", "If that's you") instead of restarting the body's hook phrase.

No hashtag spam. No external URLs in CTA text. Optional linkUrl only if clearly inferable (else omit).

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
  postObjective?: PostObjective;
}): string {
  return JSON.stringify(
    {
      post: { hook: input.hook, body: input.body, ps: input.ps ?? "" },
      postEnding: extractPostEnding(input.body, input.ps),
      postObjective: input.postObjective ?? "credibility",
      personaPromptText: input.personaPromptText.slice(0, 12000),
      profileEnrichment: input.profileEnrichment ?? {},
    },
    null,
    2,
  );
}
