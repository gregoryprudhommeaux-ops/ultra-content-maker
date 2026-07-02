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
- linkedinUrl MUST look like a real public LinkedIn profile (https://www.linkedin.com/in/firstname-lastname).
- Prefer creators who speak to the same ICP — not mega-influencers outside the niche.
- whyRelevant: 1–2 sentences in ${lang} explaining fit for THIS user's niche (not generic praise).
- lastPostAngle: describe a plausible recent post theme or hook style (paraphrase only · do not copy verbatim).
- funnelStage: one of "awareness" | "consideration" | "conversion" for the angle you'd borrow.
- name: display name · headline: their LinkedIn headline (short).
- Use well-known creators in the niche when you know them; otherwise plausible real-style profiles.
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
