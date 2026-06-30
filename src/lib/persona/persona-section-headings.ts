import type { ContentLanguage } from "@/types/workspace";
import type { PersonaRevealCardKey } from "./extract-persona-summary";

/** Headings used when reading or writing Persona prompt sections (any locale). */
export const PERSONA_PILLAR_HEADINGS: Record<
  PersonaRevealCardKey,
  readonly string[]
> = {
  positioning: [
    "Contexte auteur",
    "Author context",
    "Contexto del autor",
    "Profil auteur",
    "Author profile",
  ],
  audience: [
    "Audience",
    "Audiencia",
    "Public cible",
    "Target audience",
    "Lecteurs cibles",
  ],
  angle: ["Topic DNA", "ADN thématique", "ADN temático"],
  tone: [
    "Voix et ton",
    "Voice and tone",
    "Voz y tono",
    "Voix",
    "Voice",
    "Ton éditorial",
    "Editorial tone",
  ],
};

const DEFAULT_PILLAR_HEADING: Record<
  PersonaRevealCardKey,
  Record<ContentLanguage, string>
> = {
  positioning: {
    fr: "Contexte auteur",
    en: "Author context",
    es: "Contexto del autor",
  },
  audience: {
    fr: "Public cible",
    en: "Audience",
    es: "Audiencia",
  },
  angle: {
    fr: "ADN thématique",
    en: "Topic DNA",
    es: "ADN temático",
  },
  tone: {
    fr: "Voix et ton",
    en: "Voice and tone",
    es: "Voz y tono",
  },
};

export function defaultPillarHeading(
  key: PersonaRevealCardKey,
  lang: ContentLanguage,
): string {
  return DEFAULT_PILLAR_HEADING[key][lang] ?? DEFAULT_PILLAR_HEADING[key].en;
}
