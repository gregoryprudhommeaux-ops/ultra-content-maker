import type { ContentLanguage } from "@/types/workspace";

/** Banned cliché openers and influencer patterns · per output language. */
const BANNED_OPENERS: Record<ContentLanguage, string[]> = {
  fr: [
    "Ce matin",
    "Dimanche soir",
    "Lundi matin",
    "Vendredi soir",
    "Avec le recul",
    "Et si",
    "Je ne sais pas qui devait entendre",
    "Petit rappel",
    "Spoiler",
    "La semaine dernière j'ai réalisé que",
    "Un client m'a appelé",
    "m'a appelé en panique",
    "m'a téléphoné en urgence",
    "Hier, un prospect",
    "J'ai reçu un message",
    "Il y a quelques jours, un client",
    "Je vois beaucoup de",
    "Je vois trop de",
    "On me dit souvent",
    "On m'entend souvent dire",
    "La phrase que j'entends souvent",
    "Une phrase que j'entends souvent",
    "Ce que j'entends souvent",
    "J'entends souvent",
    "La plupart des dirigeants",
    "Trop d'entreprises",
    "Dans mon expérience",
    "Pour commencer",
    "Tout d'abord",
    "Premièrement",
    "Je suis ravi de partager",
    "Ce post traite de",
    "Dans un monde en constante évolution",
    "À l'ère du numérique",
  ],
  en: [
    "This morning",
    "Sunday night",
    "Monday morning",
    "Friday evening",
    "Looking back",
    "What if",
    "I don't know who needs to hear this",
    "Friendly reminder",
    "Spoiler alert",
    "Last week I realized",
    "A client called me",
    "called me in a panic",
    "Yesterday a prospect",
    "I got a message",
    "A few days ago a client",
    "Here's the thing",
    "Let that sink in",
    "Unpopular opinion",
    "I see a lot of",
    "I see too many",
    "I often hear",
    "The phrase I hear a lot",
    "A phrase I often hear",
    "What I often hear",
    "Most leaders",
    "Too many companies",
    "In my experience",
    "First and foremost",
    "To begin with",
    "I'm excited to share",
    "In today's fast-paced world",
    "In the dynamic landscape",
  ],
  es: [
    "Esta mañana",
    "El domingo por la noche",
    "El lunes por la mañana",
    "Con la perspectiva",
    "Y si",
    "No sé quién necesita escuchar esto",
    "Recordatorio",
    "La semana pasada me di cuenta",
    "Un cliente me llamó",
    "me llamó en pánico",
    "Ayer un prospecto",
    "Hace unos días un cliente",
    "Veo a muchos",
    "Veo demasiados",
    "A menudo escucho",
    "La frase que escucho mucho",
    "Una frase que oigo seguido",
    "Lo que más escucho",
    "La mayoría de los líderes",
    "Demasiadas empresas",
    "En mi experiencia",
    "Para empezar",
    "En primer lugar",
    "En el entorno actual",
    "En la era digital",
  ],
};

const FAKE_SCENARIO_PATTERNS: Record<ContentLanguage, string> = {
  fr: `scènes inventées type "Dimanche soir, un client m'a appelé en panique…", "Hier un CEO m'a écrit…", appels nocturnes dramatiques, anecdotes calendrier + client anonyme sans preuve dans le brief/Persona`,
  en: `fabricated scenes like "Sunday night a client called me in a panic…", "Yesterday a CEO DM'd me…", dramatic after-hours calls, calendar-stamped + anonymous-client anecdotes unless grounded in brief/Persona`,
  es: `escenas inventadas tipo "El domingo por la noche un cliente me llamó en pánico…", llamadas dramáticas fuera de horario, anécdotas con fecha + cliente anónimo sin base en el brief/Persona`,
};

/** False-consensus / survey-hook template · hard + soft variants. */
const SURVEY_HOOK_PATTERNS: Record<ContentLanguage, string> = {
  fr: `structure "faux terrain → pivot → levier" INTERDITE (variantes dures OU soft — rejeter les deux): (1) ouverture ethnographique OU soft-hear: "Je vois beaucoup de…", "La phrase / une phrase que j'entends souvent…", "Ce que j'entends souvent…", "On me dit souvent…", (2) citation inventée attribuée à une catégorie (« On a déjà des contacts sur place. ») même sans "Je vois beaucoup de", (3) creusage théâtral: "Quand je creuse…", "En creusant…", "En creusant un peu…", (4) triade parallèle OU liste à puces de qualification symétrique (3 critères "même X / même Y / même Z" ou "pas seulement A, B, C"), (5) antithese packaging: "Résultat : beaucoup de X, peu de Y" OU "moins de X, plus de Y" / "moins de monde, plus de valeur", (6) clôture soft-opinion "À mon sens, le vrai levier / la clé, c'est…"`,
  en: `BANNED "false consensus → pivot → lever" arc (hard OR soft — reject both): (1) ethnographic OR soft-hear opener: "I see a lot of…", "The phrase / a phrase I often hear…", "What I often hear…", "I often hear…", (2) invented quote attributed to a category even without "I see a lot of", (3) theatrical dig: "When I dig…", "Digging a bit…", "When you dig deeper…", (4) parallel triad OR clean 3-bullet symmetric qualification list ("same X / same Y / same Z"), (5) antithesis packaging: "Result: lots of X, few Y" OR "less X, more Y" / "fewer people, more value", (6) soft-opinion close "In my view, the real lever / the key is…"`,
  es: `estructura PROHIBIDA "falso terreno → pivote → palanca" (dura O soft — rechazar ambas): (1) apertura etnográfica O soft-hear: "Veo a muchos…", "La frase / una frase que escucho mucho…", "Lo que más escucho…", "A menudo escucho…", (2) cita inventada atribuida a una categoría aunque no diga "Veo a muchos", (3) excavación teatral: "Cuando indago…", "Al indagar…", "Cuando profundizo…", (4) tríada paralela O lista de 3 bullets de calificación simétrica, (5) antítesis packaging: "Resultado: mucho X, poco Y" O "menos X, más Y", (6) cierre soft-opinión "En mi opinión, la verdadera palanca / la clave es…"`,
};

const REGIONAL_FILTER: Record<ContentLanguage, string> = {
  fr: `Avoid English-calqued corporate FR: passive "Ce post traite de…", "Je suis ravi de partager…", "Assurez-vous de…". Enter in medias res with active voice · not "Pour commencer," / "Tout d'abord,".`,
  en: `Low-key business casual · ban loft AI vocab: testament, beacon, tapestry, landscape (abstract), pivotal, underscore, paramount, delve, journey (metaphor), plus LinkedIn-Bro hyperbole (revolutionary, thrilling, game-changing). Prefer "This actually works" over grandiloquence.`,
  es: `Distinguish Mexico vs Spain (never mix). MX: ban vosotros, vale, venga, ordenador; prefer computadora, platicar (when warm-pro fits), coordinar una reunión/llamada (not agendar), eliminar/quitar (not remover). ES-Spain: local direct register · avoid LATAM-only filler and fake "español neutro". Ban English gerund calques.`,
};

/**
 * Core anti–LinkedIn-template rules for generation, revision, and export.
 * Import via LINKEDIN_2026_SYSTEM_RULES or directly where a lighter block is needed.
 * Mirrors Cursor skill /anti-linkedin-slop.
 */
export function buildAntiLinkedInSlopRules(contentLanguage: ContentLanguage): string {
  const openers = (BANNED_OPENERS[contentLanguage] ?? BANNED_OPENERS.en)
    .map((o) => `"${o}"`)
    .join(", ");
  const fakeScenarios = FAKE_SCENARIO_PATTERNS[contentLanguage] ?? FAKE_SCENARIO_PATTERNS.en;
  const surveyHook = SURVEY_HOOK_PATTERNS[contentLanguage] ?? SURVEY_HOOK_PATTERNS.en;
  const regional = REGIONAL_FILTER[contentLanguage] ?? REGIONAL_FILTER.en;

  return `ANTI–LINKEDIN-TEMPLATE (non-negotiable):
Voice: write as an experienced practitioner, NOT as a LinkedIn influencer or generic B2B consultant. Goal: make an experienced reader think · not impress a mass audience.

BANNED structures & patterns:
- Cliché openers and hooks: ${openers}, and similar influencer templates.
- Fake situational setups: ${fakeScenarios}. Never invent dramatic client calls, DMs, or calendar-stamped scenes unless explicitly provided in postBrief, proof field, or Persona.
- Survey / false-consensus hook (very common AI tell · reject on sight): ${surveyHook}.
- Generic category quotes: never invent a "typical" phrase said by "many leaders / companies" unless that exact wording appears in brief/Persona/proof.
- Antithesis packaging: "beaucoup de X, peu de Y" / "lots of X, little Y" / "mucho X, poco Y" AND the soft twin "moins de X, plus de Y" / "less X, more Y" / "menos X, más Y" as the punchline · prefer a concrete consequence (what breaks, what you refuse, what you do next).
- Qualification-framework bullets: do NOT default to a neat 3-bullet "same problem / same decision level / same agenda" (or FR/ES equivalents) list after a soft hear-hook · fold one uneven criterion into prose, drop the other two, or make lengths asymmetric.
- Soft packaging closes: "le vrai levier", "la clé", "the real lever", "the key is", "la verdadera palanca", "à mon sens c'est", "in my view the answer is" · state the claim without the wrapping.
- Sandwich hook (visual slop): do NOT default to shock line + blank line + explanatory line for every hook. Compact 1–2 line blocks are often more human.
- School connectors: "Pour commencer / Tout d'abord / Premièrement / Enfin", "First and foremost / To begin with", "Para empezar" · paragraph order should carry the logic.
- Bullet UI slop: identical emoji on every bullet; systematic "**Bold lead:**" on every line · prefer plain "-" sometimes.
- Syntax tics (all languages · high detectability): excess em dashes (—) · max 1 per paragraph; "Ce n'est pas X, c'est Y" / "It's not about X, it's about Y" / "No es solo X, es Y" · prefer zero; lexical triplets anywhere ("clair, direct, efficace"); evenly sized paragraphs · vary hard (2-line then 8-line).
- Uniform information density (one equal-weight idea per line forever) · pack some sentences; let others breathe.
- Mushy verb stacks: permettre/favoriser/contribuer/garantir · enable/foster/facilitate/ensure · permitir/fomentar/garantizar · prefer sharp concrete verbs.
- Flat emotional glue alone (Ensuite / En pratique / Enfin) · prefer reaction beats when natural; open experiential closes · not Wikipedia morals.
- "3 lessons" / numbered moral lists, intro → anecdote → bullets → moral → rhetorical question arcs.
- Universal life lessons from banal anecdotes; interchangeable sentences; simplistic morals; generic bullet points.
- Phrases that 1000 other posts could publish today · delete before delivering.
- Interchangeable geo/sector filler: if swapping "Mexique / Amérique latine" for any other market still "works", the opener is too template · rewrite with a non-compressible stake.

Regional voice (${contentLanguage}): ${regional}

REQUIRED instead:
- Start from something specific and non-swappable: a constraint, decision criterion, number, role, deadline, or blunt opinion · grounded in brief/Persona when available. Prefer thesis-first over scene-setting.
- Observation over moral: describe what happened or what breaks in practice; do not conclude with a platitude or "the real lever is…".
- Non-obvious or counter-intuitive insight when possible; clear opinion (even partial or debatable) without soft packaging.
- Real friction when relevant: hesitation, doubt, contradiction ("I thought X; in practice Y") · only if supported by brief/Persona, never fabricated drama or fake consensus.
- Non-compressible detail when available: deadlines, budgets, roles, constraints · never invent metrics, client names, quotes, or facts absent from inputs.
- Break overly clean structure: mid-scene start, no forced moral, open thought when it fits · uneven paragraph lengths.
- Anchor in the author's mental signature from Persona (sector, geography, pragmatism) · not generic thought leadership.
- When revising: preserve 1–2 voice markers from the source (wording tic, cut rhythm, humor) · do not uniformize into generic correct prose.
- Human variability: uneven density, depth zoom (concrete↔general), intentional key-word repeats, certainty hedges, uneven reason lengths, global cadence swings.
- Anti-over-correction: keep some long fluent sentences · punchline-only choppy style is a new AI tell.
- Length on rewrite: ±15% of source unless asked otherwise.
- Meta: goal is identifiable-person asperities, not "undetectable AI". If uniformly polished, rewrite.

Style: direct, sober, compact · cut filler; if a paragraph can be removed without losing meaning, remove it · but do not gut substance for false "brevity".

Pre-delivery self-check (apply silently):
1. Could someone without field experience write this? → rewrite.
2. Does the reader learn something precise? → if not, too vague.
3. Could a reasonable expert disagree? → if not, too consensual.
4. Does any sentence sound like a fake client anecdote? → remove or replace with observation.
5. Does it open with "I see a lot of / Je vois beaucoup de / Veo a muchos" OR soft-hear ("j'entends souvent / phrase I often hear / frase que escucho") + a category quote? → rewrite thesis-first; drop fabricated quotes.
6. Could 500 similar B2B posts start the same way tomorrow (swap market/persona)? → rewrite.
7. Is the close "à mon sens / in my view, the real lever is…" OR "moins de X, plus de Y" packaging? → strip packaging; keep only the claim.
7b. "En creusant / When I dig / Al indagar" + 3 symmetric qualification bullets? → kill the dig; uneven prose for one criterion max.
8. Is the hook a sandwich (shock + blank + explain) by default? → compact if ideas belong together.
9. Any loft EN word (testament/beacon/tapestry/pivotal…) or FR "Pour commencer,"? → rewrite.
10. Em dashes stuffed / not-X-but-Y / unearned triplets / perfectly even paragraphs? → rewrite.
11. Did you sand away the author's voice into generic correct prose? → restore 1–2 markers.
12. Became telegraphic punchline-only? → restore some long fluent sentences.

Facts: never invent numbers, clients, quotes, or events not in postBrief, proof, Persona, or reference material.`;
}

/** Shorter block for CTA harmonization passes · avoids reintroducing template voice. */
export function buildAntiSlopClosingRules(contentLanguage: ContentLanguage): string {
  const fakeScenarios = FAKE_SCENARIO_PATTERNS[contentLanguage] ?? FAKE_SCENARIO_PATTERNS.en;
  return `- Do not add influencer clichés, fake client anecdotes, or ${fakeScenarios} in the closing.
- Never close with "le vrai levier / the real lever / la clave / à mon sens c'est…" packaging · state the claim plainly.
- No generic "Et vous ? / What do you think?" bait.
- closingBlock must stay sober and practitioner-toned · no dramatic scene-setting, no survey-hook reprise.`;
}
