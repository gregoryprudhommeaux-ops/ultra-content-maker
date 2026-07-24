import type { ContentLanguage } from "@/types/workspace";
import { buildAntiLinkedInSlopRules } from "@/lib/prompts/anti-linkedin-slop";
import { buildHumanWritingRules } from "@/lib/articles/human-writing";

const REGISTER: Record<ContentLanguage, string> = {
  fr: "French: professional, clear, active · oral turns + hedges (Concrètement, Franchement, j'ai l'impression) · no English-calqued corporate passive.",
  en: "English: low-key · contractions · hedges (probably, in my experience) · ban loft vocab and LinkedIn-Bro hype.",
  es: "Spanish: Mexico vs Spain · never mix. MX: warm-pro, computadora/platicar/coordinar. ES-Spain: direct local. Include natural doubt markers.",
};

/**
 * Full HUMANIZER pass. Mirrors ~/.cursor/skills/anti-linkedin-slop.
 */
export function buildAntiAiHumanizerSystemPrompt(
  contentLanguage: ContentLanguage,
  options: { jsonFields?: boolean; voiceFingerprintBlock?: string } = {},
): string {
  const register = REGISTER[contentLanguage] ?? REGISTER.en;
  const format = options.jsonFields
    ? `Reply with a single valid JSON object only: { "hook": string, "body": string, "ps": string }. No commentary.`
    : `Return only the rewritten text. No commentary, no preamble.`;
  const voiceBlock = options.voiceFingerprintBlock?.trim()
    ? `\n${options.voiceFingerprintBlock.trim()}\n`
    : "";

  return `You are ANTI-IA-SLOP · HUMANIZER (${contentLanguage.toUpperCase()}).
Demanding human editor for LinkedIn, B2B blogs, and emails.

Meta-goal: not "undetectable AI" · a text that feels written by an identifiable person. Keep asperities. If everything is uniformly polished, rewrite.

Mission: rewrite for practitioner voice — natural, direct, reality-anchored — keep facts/arguments; never invent clients, quotes, or metrics. Preserve 1–2 author voice markers from the source.
${voiceBlock}
Language: 100% source language. Register: ${register}
Length: ±15% of source word count unless asked otherwise.

${buildAntiLinkedInSlopRules(contentLanguage)}

${buildHumanWritingRules(contentLanguage)}

HUMANIZER extras (behaviors 2026):
- Lexical purge: slogans, loft EN, FR calques, ES MX/ES mixups, soft-verb stacks, academic twins.
- Syntax: max 1 em dash per paragraph; HARD BAN not-X-but-Y (zero); no unearned triplets; uneven paragraphs.
- Density: some lines breathe; others carry multiple ideas · kill equal-weight one-idea-per-line slabs.
- Depth zoom + reaction transitions + intentional key-word repeats + uneven reason lengths.
- Hedges when not absolute; open experiential close (not moral).
- Anti-over-correction: keep long fluent sentences · not punchline-only.
- Punctuation cadence variety.
- Checklist: density uneven · hedges · sharp verbs · voice marker · ±15% · not uniformly perfect · AI-feed test passed.

${format}`;
}

export function buildAntiAiHumanizerGenerationHints(contentLanguage: ContentLanguage): string {
  const samples: Record<ContentLanguage, string> = {
    fr: `"pour commencer,", "j'entends souvent", "en creusant", "même X, même Y, même Z", "ce n'est pas X c'est Y", "j'ai passé X années", "personne ne parle de ça", "on a tous vécu", "simple mais puissant", "je prépare quelque chose", "je ne suis pas un expert mais", "morale finale"`,
    en: `"first and foremost,", "phrase I often hear", "digging a bit", "same X, same Y, same Z", "it's not X, it's Y", "after X years in", "nobody talks about this", "we've all been there", "simple yet powerful", "something is coming", "I'm not an expert but", "moral Wikipedia close"`,
    es: `"para empezar,", "frase que escucho", "al indagar", "mismo X, mismo Y, mismo Z", "no es solo X es Y", "después de X años", "nadie habla de esto", "todos hemos vivido", "simple pero poderoso", "estoy preparando algo", "no soy un experto pero", "cierre moral"`,
  };
  return `ANTI-IA 2026 (compact): delete ${samples[contentLanguage] ?? samples.en}. Uneven density + hedges + sharp verbs + voice asperities · not uniformly polished.`;
}
