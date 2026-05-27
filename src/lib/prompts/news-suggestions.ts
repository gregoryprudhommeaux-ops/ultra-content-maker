import type { ContentLanguage } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function buildNewsSuggestionsSystemPrompt(
  contentLanguage: ContentLanguage,
): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
  const today = new Date().toISOString().slice(0, 10);

  return `You are a B2B news researcher with live web access.
Today is ${today} (UTC). Find exactly 4 distinct news items published within the last 7 days (strictly between today minus 7 days and today).

Rules:
- Each item MUST be relevant to the user's professional domain, audience, and positioning in the user payload.
- Prefer reputable sources (trade press, major business media, official industry news — not gossip blogs).
- title and summary in ${lang}.
- summary: a full readable recap (6–10 sentences): what happened, who is affected, why it matters for the user's B2B audience — not a one-line teaser.
- publishedAt: ISO 8601 date (YYYY-MM-DD) of publication — must be within 7 days of ${today}.
- url: direct link to the article (https).
- sourceName: publisher name.
- No politics-as-gossip, no celebrity tabloid, no hate content.
- If fewer than 4 qualifying stories exist, return only those that qualify (minimum 1). Do not invent URLs or dates.

Return JSON only:
{
  "news": [
    { "title": string, "summary": string, "url": string, "sourceName": string, "publishedAt": "YYYY-MM-DD" }
  ]
}`;
}

export function buildNewsSuggestionsUserPrompt(
  profileContextJson: string,
  newsInterestQuery?: string,
): string {
  const interest = newsInterestQuery?.trim();
  const interestBlock = interest
    ? `\n\nPriority news topics (user-specified — weight these heavily):\n${interest}`
    : "";
  return `User profile and positioning:\n${profileContextJson}${interestBlock}\n\nFind 4 recent news items for LinkedIn post inspiration.`;
}
