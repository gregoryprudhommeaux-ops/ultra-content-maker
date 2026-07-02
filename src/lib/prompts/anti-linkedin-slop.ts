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
 ],
};

const FAKE_SCENARIO_PATTERNS: Record<ContentLanguage, string> = {
 fr: `scènes inventées type "Dimanche soir, un client m'a appelé en panique…", "Hier un CEO m'a écrit…", appels nocturnes dramatiques, anecdotes calendrier + client anonyme sans preuve dans le brief/Persona`,
 en: `fabricated scenes like "Sunday night a client called me in a panic…", "Yesterday a CEO DM'd me…", dramatic after-hours calls, calendar-stamped + anonymous-client anecdotes unless grounded in brief/Persona`,
 es: `escenas inventadas tipo "El domingo por la noche un cliente me llamó en pánico…", llamadas dramáticas fuera de horario, anécdotas con fecha + cliente anónimo sin base en el brief/Persona`,
};

/**
 * Core anti–LinkedIn-template rules for generation, revision, and export.
 * Import via LINKEDIN_2026_SYSTEM_RULES or directly where a lighter block is needed.
 */
export function buildAntiLinkedInSlopRules(contentLanguage: ContentLanguage): string {
 const openers = (BANNED_OPENERS[contentLanguage] ?? BANNED_OPENERS.en)
 .map((o) => `"${o}"`)
 .join(", ");
 const fakeScenarios = FAKE_SCENARIO_PATTERNS[contentLanguage] ?? FAKE_SCENARIO_PATTERNS.en;

 return `ANTI–LINKEDIN-TEMPLATE (non-negotiable):
Voice: write as an experienced practitioner, NOT as a LinkedIn influencer. Goal: make an experienced reader think · not impress a mass audience.

BANNED structures & patterns:
- Cliché openers and hooks: ${openers}, and similar influencer templates.
- Fake situational setups: ${fakeScenarios}. Never invent dramatic client calls, DMs, or calendar-stamped scenes unless explicitly provided in postBrief, proof field, or Persona.
- "3 lessons" / numbered moral lists, intro → anecdote → bullets → moral → rhetorical question arcs.
- Universal life lessons from banal anecdotes; interchangeable sentences; simplistic morals; generic bullet points.
- Phrases that 1000 other posts could publish today · delete before delivering.

REQUIRED instead:
- Start from something specific: stakes, constraint, observation, or opinion · grounded in brief/Persona when available.
- Observation over moral: describe what happened or what you see; do not conclude with a platitude.
- Non-obvious or counter-intuitive insight when possible; clear opinion (even partial or debatable).
- Real friction when relevant: hesitation, doubt, contradiction ("I thought X; in practice Y") · only if supported by brief/Persona, never fabricated drama.
- Non-compressible detail when available: deadlines, budgets, roles, constraints · never invent metrics, client names, or facts absent from inputs.
- Break overly clean structure: mid-scene start, no forced moral, open thought when it fits.
- Anchor in the author's mental signature from Persona (sector, geography, pragmatism) · not generic thought leadership.

Style: direct, sober, compact · cut filler; if a paragraph can be removed without losing meaning, remove it.

Pre-delivery self-check (apply silently):
1. Could someone without field experience write this? → rewrite.
2. Does the reader learn something precise? → if not, too vague.
3. Could a reasonable expert disagree? → if not, too consensual.
4. Does any sentence sound like a fake client anecdote? → remove or replace with observation.

Facts: never invent numbers, clients, or events not in postBrief, proof, Persona, or reference material.`;
}

/** Shorter block for CTA harmonization passes · avoids reintroducing template voice. */
export function buildAntiSlopClosingRules(contentLanguage: ContentLanguage): string {
 const fakeScenarios = FAKE_SCENARIO_PATTERNS[contentLanguage] ?? FAKE_SCENARIO_PATTERNS.en;
 return `- Do not add influencer clichés, fake client anecdotes, or ${fakeScenarios} in the closing.
- closingBlock must stay sober and practitioner-toned · no dramatic scene-setting.`;
}
