import {
  getCurrentNewsDetail,
  isCurrentNewsEnabled,
} from "@/lib/articles/refinement";
import type { ArticleRefinement, ContentLanguage, EmojiLevel } from "@/types/workspace";
import { emojiInstruction } from "./emoji-instruction";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function buildReviseSystemPrompt(
  contentLanguage: ContentLanguage,
  emojiLevel: EmojiLevel = "light",
): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
  const emoji = emojiInstruction(emojiLevel, contentLanguage);

  return `You revise a LinkedIn post using the expert Persona and user refinement feedback.
Keep the post in ${lang}. Preserve author voice. Apply all feedback.
Emoji rule (non-negotiable): ${emoji}
If emojiLevel is light or heavy, the revised post MUST contain visible Unicode emojis.

Return JSON only: { "hook": string, "body": string, "ps": string, "scope": "generalist" | "niche", "hashtags": string[] } with exactly 4 hashtags (no # prefix). Keep the same scope unless refinement clearly requires switching breadth.`;
}

export function buildReviseUserPrompt(
  personaPromptText: string,
  article: { hook: string; body: string; ps?: string },
  refinement: ArticleRefinement,
): string {
  const currentNews = {
    enabled: isCurrentNewsEnabled(refinement),
    detail: getCurrentNewsDetail(refinement) ?? "",
  };

  return JSON.stringify(
    {
      personaPromptText,
      current: article,
      refinement,
      currentNews,
    },
    null,
    2,
  );
}
