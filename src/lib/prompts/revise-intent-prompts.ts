import type { ContentLanguage } from "@/types/workspace";

export type ReviseIntent =
  | "more_proof"
  | "more_niche"
  | "conversation_end"
  | "less_generic";

export const REVISE_INTENTS: ReviseIntent[] = [
  "more_proof",
  "more_niche",
  "conversation_end",
  "less_generic",
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
      "Supprime les formulations type IA / LinkedIn ; affine le point de vue humain ; garde les faits et la structure.",
  },
  en: {
    more_proof:
      "Add a stronger concrete proof element (case, metric, or field observation). Keep voice and scope.",
    more_niche:
      "Make the post clearly more niche-specific for the ICP; reduce generic platitudes.",
    conversation_end:
      "Rewrite the closing to invite thoughtful comments from the target audience — no engagement bait.",
    less_generic:
      "Remove AI slop and clichés; sharpen the human point of view; keep facts and structure.",
  },
  es: {
    more_proof:
      "Añade una prueba concreta más sólida (caso, cifra u observación de campo). Mantén la voz y el alcance del post.",
    more_niche:
      "Haz el post claramente más específico para el ICP; reduce las frases genéricas.",
    conversation_end:
      "Reescribe el cierre para invitar comentarios reflexivos del público objetivo — sin cebo de engagement.",
    less_generic:
      "Elimina clichés tipo IA / LinkedIn; afina el punto de vista humano; conserva hechos y estructura.",
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
