import {
  getCurrentNewsDetail,
  isCorrosiveToneEdge,
  isCurrentNewsEnabled,
} from "@/lib/articles/refinement";
import { buildToneEdgeInstruction } from "@/lib/prompts/tone-edge";
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
  corrosiveTone = false,
): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
  const emoji = emojiInstruction(emojiLevel, contentLanguage);
  const toneNote = corrosiveTone
    ? " User requested a contrarian shift (challenge received idea or news angle only). Apply toneEdgeInstruction as top priority. Strictly forbid insults, politics, racism, hate, and offensive humor — professional B2B only."
    : "";

  return `You revise a LinkedIn post using the expert Persona and user refinement feedback.
Keep the post in ${lang}. Preserve author expertise. Apply all feedback.${toneNote}
Emoji rule (non-negotiable): ${emoji}
If emojiLevel is light or heavy, the revised post MUST contain visible Unicode emojis.

Return JSON only: { "hook": string, "body": string, "ps": string, "scope": "generalist" | "niche", "hashtags": string[] } with exactly 4 hashtags (no # prefix). Keep the same scope unless refinement clearly requires switching breadth.`;
}

export function buildReviseUserPrompt(
  personaPromptText: string,
  article: { hook: string; body: string; ps?: string },
  refinement: ArticleRefinement,
  contentLanguage: ContentLanguage,
): string {
  const currentNews = {
    enabled: isCurrentNewsEnabled(refinement),
    detail: getCurrentNewsDetail(refinement) ?? "",
  };
  const toneEdgeInstruction = buildToneEdgeInstruction(
    contentLanguage,
    refinement.toneEdge,
  );

  return JSON.stringify(
    {
      personaPromptText,
      current: article,
      refinement,
      currentNews,
      toneEdge: refinement.toneEdge ?? "default",
      toneEdgeInstruction,
      corrosiveToneRequested: isCorrosiveToneEdge(refinement),
    },
    null,
    2,
  );
}
