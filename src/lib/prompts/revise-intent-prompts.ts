import type { ContentLanguage } from "@/types/workspace";

export type ReviseIntent =
  | "more_proof"
  | "more_niche"
  | "conversation_end"
  | "less_generic"
  | "break_template"
  | "trim_filler";

export const REVISE_INTENTS: ReviseIntent[] = [
  "more_proof",
  "more_niche",
  "conversation_end",
  "less_generic",
  "break_template",
  "trim_filler",
];

const PROMPTS: Record<ContentLanguage, Record<ReviseIntent, string>> = {
  fr: {
    more_proof:
      "Ajoute une preuve concrète plus forte (cas client, chiffre ou observation terrain). Garde la voix et le périmètre du post.",
    more_niche:
      "Rends le post clairement plus spécifique à l’ICP ; réduis les platitudes génériques.",
    conversation_end:
      "Réécris la conclusion pour inviter des commentaires réfléchis de la cible — sans engagement bait.",
    less_generic:
      "Supprime formulations type IA / influenceur LinkedIn ; affine le point de vue humain ; élimine anecdotes client inventées ; garde les faits et la structure.",
    break_template:
      "Casse la structure template (intro-anecdote-leçons-conclusion). Supprime les fausses mises en situation (« Dimanche soir, un client m'a appelé en panique… »). Remplace par observation ou opinion ancrée.",
    trim_filler:
      "Coupe ~30 % du remplissage sans perdre le sens. Phrases plus compactes, zéro platitude interchangeable.",
  },
  en: {
    more_proof:
      "Add a stronger concrete proof element (case, metric, or field observation). Keep voice and scope.",
    more_niche:
      "Make the post clearly more niche-specific for the ICP; reduce generic platitudes.",
    conversation_end:
      "Rewrite the closing to invite thoughtful comments from the target audience — no engagement bait.",
    less_generic:
      "Remove AI slop and LinkedIn influencer clichés; sharpen the human point of view; cut fake client anecdotes; keep facts and structure.",
    break_template:
      "Break the template arc (intro-story-lessons-conclusion). Remove fake situational setups (\"Sunday night a client called me in panic…\"). Replace with grounded observation or opinion.",
    trim_filler:
      "Cut ~30% filler without losing meaning. Tighter sentences, zero interchangeable platitudes.",
  },
  es: {
    more_proof:
      "Añade una prueba concreta más sólida (caso, cifra u observación de campo). Mantén la voz y el alcance del post.",
    more_niche:
      "Haz el post claramente más específico para el ICP; reduce las frases genéricas.",
    conversation_end:
      "Reescribe el cierre para invitar comentarios reflexivos del público objetivo — sin cebo de engagement.",
    less_generic:
      "Elimina clichés tipo IA / influencer LinkedIn; afina el punto de vista humano; quita anécdotas de cliente inventadas; conserva hechos y estructura.",
    break_template:
      "Rompe la estructura plantilla (intro-anécdota-lecciones-conclusión). Elimina escenas inventadas (\"El domingo por la noche un cliente me llamó en pánico…\"). Sustituye por observación u opinión fundamentada.",
    trim_filler:
      "Recorta ~30 % del relleno sin perder el sentido. Frases más compactas, cero platitudes intercambiables.",
  },
};

/** Instruction sent to the revise API — always in the post's content language. */
export function getReviseIntentPrompt(
  intent: ReviseIntent,
  contentLanguage: ContentLanguage,
): string {
  return (
    PROMPTS[contentLanguage]?.[intent] ??
    PROMPTS.en[intent]
  );
}
