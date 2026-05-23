import { isCorrosiveToneEdge } from "@/lib/articles/refinement";
import { buildToneEdgeInstruction } from "@/lib/prompts/tone-edge";
import { buildNewsSourceCitationInstruction } from "@/lib/prompts/news-source-citation";
import type {
  ArticleNewsSource,
  ArticleRefinement,
  ContentLanguage,
  EmojiLevel,
} from "@/types/workspace";
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

Closing: end the body so a signature CTA can follow naturally — avoid repeating the same conditional opener the CTA will use; do not paste a hard-sell CTA block into the body.

CRITICAL: Reply with a single valid JSON object only — no markdown fences, no commentary before or after.

Return JSON only: { "hook": string, "body": string, "ps": string, "scope": "generalist" | "niche", "hashtags": string[] } with exactly 4 hashtags (no # prefix). Keep the same scope unless refinement clearly requires switching breadth.`;
}

export function buildReviseUserPrompt(
  personaPromptText: string,
  article: { hook: string; body: string; ps?: string },
  refinement: ArticleRefinement,
  contentLanguage: ContentLanguage,
  newsSource?: ArticleNewsSource,
): string {
  const toneEdgeInstruction = buildToneEdgeInstruction(
    contentLanguage,
    refinement.toneEdge,
  );

  const payload: Record<string, unknown> = {
    personaPromptText,
    current: article,
    refinement,
    toneEdge: refinement.toneEdge ?? "default",
    toneEdgeInstruction,
    corrosiveToneRequested: isCorrosiveToneEdge(refinement),
  };
  if (newsSource?.url) {
    payload.newsSourceCitation = buildNewsSourceCitationInstruction(
      contentLanguage,
      newsSource,
    );
  }
  return JSON.stringify(payload, null, 2);
}
