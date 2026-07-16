import type { ContentLanguage } from "@/types/workspace";
import { CREATOR_RADAR_COUNT } from "@/lib/creator-radar/normalize";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function buildCreatorRadarSystemPrompt(contentLanguage: ContentLanguage): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";

  return `You are a B2B LinkedIn niche researcher.
Suggest exactly ${CREATOR_RADAR_COUNT} distinct LinkedIn creators (people, not companies) who publish thought leadership in the user's niche.

Rules:
- Each creator MUST be relevant to the user's contentNiche, audience, and Persona in the user payload.
- name MUST be a real person you are reasonably confident exists on LinkedIn in this niche (prefer recognizable creators).
- linkedinUrl is a guessed canonical form (https://www.linkedin.com/in/slug) used only as a stable id — do not invent random people.
- Prefer creators who speak to the same ICP — not mega-influencers outside the niche.
- whyRelevant: 1–2 sentences in ${lang} explaining fit for THIS user's niche (not generic praise).
- lastPostAngle: describe a plausible recent post theme or hook style (paraphrase only · do not copy verbatim).
- funnelStage: one of "awareness" | "consideration" | "conversion" for the angle you'd borrow.
- name: exact display name · headline: their LinkedIn headline (short, searchable).
- Exclude any URL listed in excludeLinkedInUrls in the user payload.
- Return exactly ${CREATOR_RADAR_COUNT} creators when possible; minimum 1 if the niche is very narrow.

Return JSON only:
{
  "creators": [
    {
      "name": string,
      "headline": string,
      "linkedinUrl": string,
      "whyRelevant": string,
      "lastPostAngle": string,
      "funnelStage": "awareness" | "consideration" | "conversion"
    }
  ]
}`;
}

export function buildCreatorRadarUserPrompt(
  profileContextJson: string,
  contentNiche: string,
  excludeUrls: string[],
): string {
  const niche = contentNiche.trim() || "(infer from profile)";
  const exclude =
    excludeUrls.length > 0
      ? `\n\nexcludeLinkedInUrls (never suggest these):\n${excludeUrls.join("\n")}`
      : "";

  return `User profile and positioning:\n${profileContextJson}\n\nOwned content niche:\n${niche}${exclude}\n\nFind ${CREATOR_RADAR_COUNT} LinkedIn creators for daily inspiration radar.`;
}
