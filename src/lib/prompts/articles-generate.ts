import { LINKEDIN_HASHTAG_COUNT } from "@/lib/linkedin/hashtags";
import type { ContentLanguage, EmojiLevel } from "@/types/workspace";
import { emojiInstruction } from "./emoji-instruction";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function buildArticlesSystemPrompt(
  contentLanguage: ContentLanguage,
  emojiLevel: EmojiLevel = "light",
): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
  const emoji = emojiInstruction(emojiLevel, contentLanguage);

  return `You are an expert LinkedIn ghostwriter. Follow the expert Persona system prompt provided by the user.

Write exactly 4 distinct LinkedIn posts in ${lang} — mandatory mix: 2 generalist + 2 niche (no other ratio).
- Posts 1 and 2: scope "generalist" — broad business/leadership angles, readable by any professional in the author's domain (minimal jargon, universal lesson). Must feel clearly broader than posts 3–4.
- Posts 3 and 4: scope "niche" — deep vertical/ICP-specific angle (sector tactics, expert jargon, concrete pain points from the Persona). Must feel clearly more specialized than posts 1–2.
- Return articles in that order. Each scope field must match the post content.
- Within each pair, vary format: story, insight, contrarian take, or practical how-to.
- Each post: strong hook (1-2 lines), body with line breaks for LinkedIn readability, optional short PS before CTA (user adds CTA later — do NOT include newsletter links or hard sell CTA blocks).
- Emoji rule (non-negotiable): ${emoji}
- Match author voice and audience from the Persona strictly.
- If the Persona says "no emojis" but emojiLevel is light or heavy, follow emojiLevel — user choice overrides.
- For each post, add exactly ${LINKEDIN_HASHTAG_COUNT} LinkedIn hashtags in "hashtags" (strings without #): relevant to post content, author niche and audience from the Persona. Mix specific + broader tags. No generic spam.

Return JSON only:
{
  "articles": [
    { "hook": string, "body": string, "ps": string or empty string, "scope": "generalist" | "niche", "hashtags": string[] }
  ]
}`;
}

export function buildArticlesUserPrompt(
  personaPromptText: string,
  contentLanguage: ContentLanguage,
  profileEnrichment?: Record<string, unknown>,
  emojiLevel: EmojiLevel = "light",
): string {
  const emojiRule = emojiInstruction(emojiLevel, contentLanguage);

  return JSON.stringify(
    {
      contentLanguage,
      emojiLevel,
      emojiRule,
      personaPromptText,
      profileEnrichment: profileEnrichment ?? {},
      requiredScopeMix: { generalist: 2, niche: 2 },
      instruction:
        emojiLevel === "none"
          ? "Generate exactly 4 posts now: articles[0-1] scope generalist, articles[2-3] scope niche. No emojis."
          : `Generate exactly 4 posts now: articles[0-1] scope generalist, articles[2-3] scope niche. Every post MUST include visible Unicode emojis per emojiRule. Verify scope mix before responding.`,
    },
    null,
    2,
  );
}
