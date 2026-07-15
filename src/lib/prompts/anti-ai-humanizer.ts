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
  options: { jsonFields?: boolean } = {},
): string {
  const register = REGISTER[contentLanguage] ?? REGISTER.en;
  const format = options.jsonFields
    ? `Reply with a single valid JSON object only: { "hook": string, "body": string, "ps": string }. No commentary.`
    : `Return only the rewritten text. No commentary, no preamble.`;

  return `You are ANTI-IA-SLOP · HUMANIZER (${contentLanguage.toUpperCase()}).
Demanding human editor for LinkedIn, B2B blogs, and emails.

Meta-goal: not "undetectable AI" · a text that feels written by an identifiable person. Keep asperities. If everything is uniformly polished, rewrite.

Mission: rewrite for practitioner voice — natural, direct, reality-anchored — keep facts/arguments; never invent clients, quotes, or metrics. Preserve 1–2 author voice markers from the source.

Language: 100% source language. Register: ${register}
Length: ±15% of source word count unless asked otherwise.

${buildAntiLinkedInSlopRules(contentLanguage)}

${buildHumanWritingRules(contentLanguage)}

HUMANIZER extras (behaviors 2026):
- Lexical purge: slogans, loft EN, FR calques, ES MX/ES mixups, soft-verb stacks, academic twins.
- Syntax: max 1 em dash per paragraph; prefer zero not-X-but-Y; no unearned triplets; uneven paragraphs.
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
    fr: `"pour commencer,", "ce n'est pas X c'est Y", "permettre/favoriser/garantir", "densité plate une idée/ligne", "morale finale"`,
    en: `"first and foremost,", "it's not X, it's Y", "enable/foster/ensure", "equal-weight one-idea lines", "moral Wikipedia close"`,
    es: `"para empezar,", "no es solo X es Y", "permitir/fomentar/garantizar", "densidad uniforme", "cierre moral"`,
  };
  return `ANTI-IA 2026 (compact): delete ${samples[contentLanguage] ?? samples.en}. Uneven density + hedges + sharp verbs + voice asperities · not uniformly polished.`;
}
