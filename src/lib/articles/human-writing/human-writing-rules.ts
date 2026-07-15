import type { ContentLanguage } from "@/types/workspace";
import { BANNED_PHRASES_BY_LANG } from "./banned-phrases";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

function bannedPhraseSample(contentLanguage: ContentLanguage): string {
  const phrases = (BANNED_PHRASES_BY_LANG[contentLanguage] ?? BANNED_PHRASES_BY_LANG.en)
    .slice(0, 18)
    .map((p) => `"${p.phrase}"`)
    .join(", ");
  return phrases;
}

/**
 * Injectable prompt block for generation, revision, and quality critique.
 * Aligned with Cursor skill /anti-linkedin-slop (syntax + human writing behaviors).
 */
export function buildHumanWritingRules(contentLanguage: ContentLanguage): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
  const banned = bannedPhraseSample(contentLanguage);

  const opinionExamples: Record<ContentLanguage, string> = {
    fr: 'désaccord net, "franchement", incertitude ("j\'ai l\'impression", "pas toujours", "je peux me tromper") · éviter "À mon sens, le vrai levier…"',
    en: 'blunt take, "honestly", hedges ("probably", "in my experience", "I could be wrong") · avoid "the real lever is…" packaging',
    es: 'posición clara, "honestamente", matices ("probablemente", "en mi experiencia", "puedo equivocarme") · evitar "la verdadera palanca…"',
  };

  const softVerbs: Record<ContentLanguage, string> = {
    fr: 'éviter verbes mous empilés: "permettre/favoriser/contribuer/offrir/garantir/assurer" → préférer "bloque, casse, ralentit, pousse, évite"',
    en: 'avoid mushy verb stacks: "enable/foster/facilitate/provide/ensure" → prefer "blocks, breaks, slows, pushes, avoids"',
    es: 'evitar verbos blandos: "permitir/fomentar/contribuir/ofrecer/garantizar" → preferir "bloquea, frena, empuja, evita"',
  };

  return `HUMAN WRITING (anti-AI detection · ${lang} · non-negotiable):

Meta-goal: not "undetectable AI" · a text that feels written by an identifiable person. Keep asperities (lexical tics, rhythm, intentional repeats, hedges, imperfect but credible lines). Uniformly polished prose = still slop.

1) Ban AI language tics
- Prefer zero "Ce n'est pas X, c'est Y" / "It's not X, it's Y" / "No es solo X, es Y" · hard max 1, never stack two.
- No lexical triplets anywhere ("clair, direct, efficace") · pairs only, occasional.
- Blacklist: ${banned}, and similar filler · delete before delivering.
- Soft verbs: ${softVerbs[contentLanguage] ?? softVerbs.en}.
- Common word over academic twin (voir>observer, show>demonstrate, ver>observar).

2) Punctuation & rhythm
- Em dash (—): max 1 per paragraph · prefer rare · commas/periods instead.
- Vary sentence length · keep several LONG fluent sentences (telegraphic punchline-only is a tell).
- Vary punctuation cadence (periods, colons, parentheses, occasional incomplete beat) · not metronome ". . ." only.
- Never 4–5 consecutive same-length sentences.

3) Variabilité humaine (behaviors, not just bans)
- Uneven information density: some lines only breathe; others pack several ideas · reject equal-weight one-idea-per-line slabs.
- Depth zoom: concrete → general → concrete → opinion.
- Reaction transitions when natural ("Ce qui m'a surpris", "Franchement", "Honestly", "Lo que me sorprendió") · not only flat "Ensuite / En pratique / Enfin".
- Intentional repetition of a key word OK if stronger than forced synonyms.
- Uneven development when listing reasons (8 lines / 1 line / 4 lines · never symmetrical chapters).
- Certainty hedges when claim isn't absolute: ${opinionExamples[contentLanguage] ?? opinionExamples.en}.
- Controlled imperfections: slightly imperfect but credible > perfectly optimized line.
- Global cadence: long block → one line → dense block → short line.

4) Lists & emojis
- Prefer short paragraphs over bullet spam.
- Max 3 emojis per post · never start every line with an emoji.
- No systematic "**Bold lead:**" on every bullet.

5) Structure patterns to break
- Reject every-paragraph-exactly-2-sentences slabs and even paragraph heights.
- Avoid sandwich hooks (shock + blank + explain) as default.
- Open closes ("C'est comme ça que je le vois aujourd'hui") · not moral Wikipedia ("Finalement, tout est une question d'exécution").

6) Voice & length
- Preserve 1–2 author voice markers when revising.
- At least one "je"/"nous" (I/we) when fitting · practitioner voice.
- Rewrite length within ±15% of source unless asked otherwise.

Pre-delivery: uneven density + hedges + sharp verbs + voice marker + no invented facts + not uniformly "perfect" + would not vanish as obvious AI in a saturated feed.`;
}
