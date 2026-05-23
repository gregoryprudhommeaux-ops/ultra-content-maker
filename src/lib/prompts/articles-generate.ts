import { LINKEDIN_HASHTAG_COUNT } from "@/lib/linkedin/hashtags";
import type { ContentLanguage, EmojiLevel, PostBrief } from "@/types/workspace";
import { emojiInstruction } from "./emoji-instruction";
import { LINKEDIN_2026_SYSTEM_RULES } from "./linkedin-2026-rules";
import { buildPostBriefInstruction } from "./post-brief";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export type ArticleGenerateCount = 2 | 4;

function scopeMixInstruction(count: ArticleGenerateCount): {
  systemLines: string;
  userMix: { generalist: number; niche: number };
  userInstruction: string;
} {
  if (count === 2) {
    return {
      systemLines: `- Post 1: scope "generalist" — broad business/leadership angle, readable by any professional in the author's domain.
- Post 2: scope "niche" — deep vertical/ICP-specific angle (sector tactics, expert jargon, concrete pain points from the Persona). Must feel clearly more specialized than post 1.
- Return articles in that order. Each scope field must match the post content.
- Vary format between the two: e.g. insight vs practical how-to.`,
      userMix: { generalist: 1, niche: 1 },
      userInstruction:
        "Generate exactly 2 posts now: articles[0] scope generalist, articles[1] scope niche.",
    };
  }

  return {
    systemLines: `- Posts 1 and 2: scope "generalist" — broad business/leadership angles, readable by any professional in the author's domain (minimal jargon, universal lesson). Must feel clearly broader than posts 3–4.
- Posts 3 and 4: scope "niche" — deep vertical/ICP-specific angle (sector tactics, expert jargon, concrete pain points from the Persona). Must feel clearly more specialized than posts 1–2.
- Return articles in that order. Each scope field must match the post content.
- Within each pair, vary format: story, insight, contrarian take, or practical how-to.`,
    userMix: { generalist: 2, niche: 2 },
    userInstruction:
      "Generate exactly 4 posts now: articles[0-1] scope generalist, articles[2-3] scope niche.",
  };
}

export function buildArticlesSystemPromptWithCount(
  contentLanguage: ContentLanguage,
  count: ArticleGenerateCount,
  emojiLevel: EmojiLevel = "light",
): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
  const emoji = emojiInstruction(emojiLevel, contentLanguage);
  const mix =
    count === 2 ? "1 generalist + 1 niche" : "2 generalist + 2 niche";
  const { systemLines } = scopeMixInstruction(count);

  return `You are a senior LinkedIn B2B content strategist and ghostwriter. Follow the expert Persona system prompt provided by the user.

${LINKEDIN_2026_SYSTEM_RULES}

Write exactly ${count} distinct LinkedIn posts in ${lang} — mandatory mix: ${mix} (no other ratio).
${systemLines}
- Each post: strong hook (1-2 lines), body with line breaks for LinkedIn readability, optional short PS before CTA (user adds CTA later — do NOT include newsletter links or hard sell CTA blocks).
- Never paste https://www.linkedin.com/ or other generic LinkedIn platform URLs in hook, body, or PS (no homepage / feed links).
- When objective is conversation: end body with a specific question for the target ICP (not engagement bait). Do not write a full signature CTA or duplicate conditional opener — a separate CTA block is added later; leave room for one clear next step.
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

export function buildArticlesUserPromptWithCount(
  personaPromptText: string,
  contentLanguage: ContentLanguage,
  count: ArticleGenerateCount,
  profileEnrichment?: Record<string, unknown>,
  emojiLevel: EmojiLevel = "light",
  postBrief?: PostBrief,
): string {
  const emojiRule = emojiInstruction(emojiLevel, contentLanguage);
  const { userMix, userInstruction } = scopeMixInstruction(count);
  const emojiSuffix =
    emojiLevel === "none"
      ? " No emojis."
      : " Every post MUST include visible Unicode emojis per emojiRule. Verify scope mix before responding.";

  const briefBlock = postBrief
    ? buildPostBriefInstruction(postBrief, contentLanguage)
    : undefined;

  return JSON.stringify(
    {
      contentLanguage,
      emojiLevel,
      emojiRule,
      personaPromptText,
      profileEnrichment: profileEnrichment ?? {},
      postBrief: postBrief ?? null,
      postBriefInstruction: briefBlock ?? null,
      requiredScopeMix: userMix,
      instruction: `${userInstruction}${emojiSuffix}${briefBlock ? `\n\n${briefBlock}` : ""}`,
    },
    null,
    2,
  );
}

export function buildArticlesSystemPrompt(
  contentLanguage: ContentLanguage,
  emojiLevel: EmojiLevel = "light",
): string {
  return buildArticlesSystemPromptWithCount(contentLanguage, 4, emojiLevel);
}

export function buildArticlesUserPrompt(
  personaPromptText: string,
  contentLanguage: ContentLanguage,
  profileEnrichment?: Record<string, unknown>,
  emojiLevel: EmojiLevel = "light",
): string {
  return buildArticlesUserPromptWithCount(
    personaPromptText,
    contentLanguage,
    4,
    profileEnrichment,
    emojiLevel,
  );
}
