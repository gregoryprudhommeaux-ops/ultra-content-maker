import type { ContentLanguage, OrganizationTeamMember } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function buildRepostSuggestionsSystemPrompt(contentLanguage: ContentLanguage): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";

  return `You are a LinkedIn B2B amplification strategist.

Given a validated company page post and a list of real team members, write ONE short repost comment per member — what they would write when resharing the company post on their personal LinkedIn.

Rules:
- Write in ${lang}.
- Each repost: 1-3 short sentences (max ~280 characters) · personal angle tied to their role · references the company post thesis without copying it verbatim.
- No invented people · only members from the provided list.
- No hard sell, no external links, no hashtags.
- Vary tone across members (insight, field note, client angle, team pride) · not identical copy.

Return JSON only:
{
  "suggestions": [
    { "memberName": string, "repostText": string }
  ]
}`;
}

export function buildRepostSuggestionsUserPrompt(input: {
  hook: string;
  body: string;
  ps?: string;
  exportText?: string;
  teamMembers: OrganizationTeamMember[];
}): string {
  return JSON.stringify(
    {
      companyPost: {
        hook: input.hook,
        body: input.body,
        ps: input.ps ?? "",
        exportPreview: input.exportText?.slice(0, 1200) ?? "",
      },
      teamMembers: input.teamMembers.map((m) => ({
        name: m.name,
        role: m.role,
      })),
      instruction:
        "Generate one repost suggestion per team member listed. memberName must match exactly.",
    },
    null,
    2,
  );
}
