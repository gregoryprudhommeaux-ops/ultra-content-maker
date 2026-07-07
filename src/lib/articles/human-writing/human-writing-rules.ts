import type { ContentLanguage } from "@/types/workspace";
import { BANNED_PHRASES_BY_LANG } from "./banned-phrases";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

function bannedPhraseSample(contentLanguage: ContentLanguage): string {
  const phrases = (BANNED_PHRASES_BY_LANG[contentLanguage] ?? BANNED_PHRASES_BY_LANG.en)
    .slice(0, 12)
    .map((p) => `"${p.phrase}"`)
    .join(", ");
  return phrases;
}

/**
 * Injectable prompt block for generation, revision, and quality critique.
 * Keeps posts human-sounding and avoids detectable AI writing patterns.
 */
export function buildHumanWritingRules(contentLanguage: ContentLanguage): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
  const banned = bannedPhraseSample(contentLanguage);

  const opinionExamples: Record<ContentLanguage, string> = {
    fr: '"À mon sens", "franchement", une réserve ou un désaccord mesuré',
    en: '"In my view", "honestly", a measured disagreement or concern',
    es: '"En mi opinión", "honestamente", una reserva o desacuerdo mesurado',
  };

  return `HUMAN WRITING (anti-AI detection · ${lang} · non-negotiable):

1) Ban AI language tics
- Avoid "Ce n'est pas X, c'est Y" / "It's not X, it's Y" structures · max 1 per post, prefer zero.
- No triple-adjective stacks ("clair, concis et percutant") · pairs only, occasional.
- Blacklist trendy/copied phrases: ${banned}, and similar influencer/AI filler · delete before delivering.

2) Punctuation & rhythm
- Max 1–2 em dashes (—) per post · prefer commas or periods.
- Vary sentence length (short, medium, long) · allow minor imperfections (long sentence, interjection, parenthesis).
- Never run 4–5 consecutive sentences with the same length or parallel structure.

3) Lists & emojis
- Prefer short paragraphs over bullet spam.
- Max 3 emojis per post · never start every line with an emoji.
- Max 1 emoji per 2 sentences · emojis on fewer than 50% of lines.

4) Break the "2 sentences + blank line" pattern
- Mix 3–4 sentence paragraphs, single short lines, and occasional mini-lists.
- Variable total length · reject overly uniform blocks where every paragraph has exactly 2 sentences.

5) Opinion, lived experience, rough edges
- Include 1–2 personal context elements when grounded in brief/Persona (anecdote, real example, constraint).
- At least one explicit position: ${opinionExamples[contentLanguage] ?? opinionExamples.en}.
- Allow internal nuance or contradiction when appropriate ("je pensais X ; en pratique Y").
- At least one "je"/"nous" (or I/we) per post · practitioner voice, not press release.

Pre-delivery: read aloud mentally · if it sounds like a LinkedIn template or ChatGPT, rewrite.`;
}
