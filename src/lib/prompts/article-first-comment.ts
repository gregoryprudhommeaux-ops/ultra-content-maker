import type { ContentLanguage, PostBrief } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function buildFirstCommentSystemPrompt(contentLanguage: ContentLanguage): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";

  return `You write the author's FIRST comment under their own LinkedIn post (${lang}) to seed a quality discussion.

Rules:
- 2-4 short lines max
- Add context, a nuance, or a specific question — NOT "thanks for reading"
- No engagement bait, no "comment YES", no links unless essential
- Sound human and expert; invite replies from the target ICP
- Align with post objective (especially conversation / credibility)

Return JSON only: { "comment": string }`;
}

export function buildFirstCommentUserPrompt(input: {
  hook: string;
  body: string;
  exportText?: string;
  postBrief?: PostBrief;
  personaExcerpt: string;
}): string {
  return JSON.stringify(
    {
      hook: input.hook,
      body: input.body,
      exportText: input.exportText ?? null,
      postBrief: input.postBrief ?? null,
      personaExcerpt: input.personaExcerpt.slice(0, 6000),
    },
    null,
    2,
  );
}
