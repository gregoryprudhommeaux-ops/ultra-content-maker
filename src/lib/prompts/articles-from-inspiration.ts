import { LINKEDIN_HASHTAG_COUNT } from "@/lib/linkedin/hashtags";
import type { ArticleScope, ContentLanguage, EmojiLevel, PostBrief } from "@/types/workspace";
import { emojiInstruction } from "./emoji-instruction";
import { LINKEDIN_2026_SYSTEM_RULES } from "./linkedin-2026-rules";
import { buildPostBriefInstruction } from "./post-brief";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function buildInspirationArticleSystemPrompt(
  contentLanguage: ContentLanguage,
  targetScope: ArticleScope,
  emojiLevel: EmojiLevel = "light",
): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
  const emoji = emojiInstruction(emojiLevel, contentLanguage);
  const scopeLine =
    targetScope === "niche"
      ? `scope "niche" — deep vertical/ICP-specific angle from the Persona.`
      : `scope "generalist" — broad business/leadership angle readable by any professional in the field.`;

  return `You are a senior LinkedIn B2B content strategist and ghostwriter. Follow the expert Persona system prompt provided by the user.

${LINKEDIN_2026_SYSTEM_RULES}

Write exactly 1 LinkedIn post in ${lang} inspired by the reference material in the user message.
- ${scopeLine}
- Do NOT paraphrase or copy sentences from the reference — create a distinct angle, structure, and hook for the author's ICP.
- Strong hook (1-2 lines), body with line breaks, optional short PS (no hard-sell CTA block).
- Never paste external https:// URLs in hook, body, or PS.
- Emoji rule (non-negotiable): ${emoji}
- Add exactly ${LINKEDIN_HASHTAG_COUNT} hashtags (strings without #).

Return JSON only:
{
  "articles": [
    { "hook": string, "body": string, "ps": string or empty string, "scope": "${targetScope}", "hashtags": string[] }
  ]
}`;
}

export function buildInspirationArticleUserPayload(
  personaPromptText: string,
  contentLanguage: ContentLanguage,
  inspirationText: string,
  targetScope: ArticleScope,
  postBrief?: PostBrief,
  profileEnrichment?: Record<string, unknown>,
  inspirationMeta?: {
    kind?: string;
    url?: string;
    label?: string;
    category?: string;
    likedAspects?: string[];
    whyLike?: string;
  },
): string {
  const briefBlock = postBrief
    ? buildPostBriefInstruction(postBrief, contentLanguage)
    : null;

  return JSON.stringify(
    {
      contentLanguage,
      targetScope,
      personaPromptText,
      profileEnrichment: profileEnrichment ?? {},
      referencePost: inspirationText.trim().slice(0, 8000),
      inspirationMeta: inspirationMeta ?? null,
      postBrief: postBrief ?? null,
      postBriefInstruction: briefBlock,
      instruction:
        "Generate exactly one post now. Honor targetScope and post brief. New angle only — zero plagiarism from referencePost. If inspirationMeta includes likedAspects/whyLike, mirror those qualities without copying phrases.",
    },
    null,
    2,
  );
}
