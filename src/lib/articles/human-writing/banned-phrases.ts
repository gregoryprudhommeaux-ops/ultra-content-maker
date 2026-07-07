import type { ContentLanguage } from "@/types/workspace";

/** Exact or substring phrases to flag before publication (per language). */
export const BANNED_PHRASES_BY_LANG: Record<
  ContentLanguage,
  { id: string; phrase: string }[]
> = {
  fr: [
    { id: "baisser_la_friction", phrase: "baisser la friction" },
    { id: "reduire_la_friction", phrase: "réduire la friction" },
    { id: "game_changer", phrase: "game changer" },
    { id: "dans_un_monde_ou", phrase: "dans un monde où" },
    { id: "dans_un_monde", phrase: "dans un monde" },
    { id: "spoiler", phrase: "spoiler :" },
    { id: "spoiler_alert", phrase: "spoiler alert" },
    { id: "en_fin_de_compte", phrase: "en fin de compte" },
    { id: "la_cle_du_succes", phrase: "la clé du succès" },
    { id: "penser_hors_des_sentiers", phrase: "penser hors des sentiers" },
    { id: "booster_votre", phrase: "booster votre" },
    { id: "unlock", phrase: "unlock" },
    { id: "debloquer", phrase: "débloquer" },
    { id: "plongeons", phrase: "plongeons" },
    { id: "ravi_de_partager", phrase: "ravi de partager" },
    { id: "je_suis_ravi", phrase: "je suis ravi" },
    { id: "takeaway_cle", phrase: "takeaway clé" },
    { id: "au_final", phrase: "au final" },
    { id: "sans_further_ado", phrase: "sans further ado" },
    { id: "mindset", phrase: "mindset" },
    { id: "synergie", phrase: "synergie" },
    { id: "disruptif", phrase: "disruptif" },
  ],
  en: [
    { id: "lower_friction", phrase: "lower the friction" },
    { id: "reduce_friction", phrase: "reduce friction" },
    { id: "game_changer", phrase: "game changer" },
    { id: "in_todays_world", phrase: "in today's world" },
    { id: "in_a_world_where", phrase: "in a world where" },
    { id: "spoiler", phrase: "spoiler:" },
    { id: "spoiler_alert", phrase: "spoiler alert" },
    { id: "at_the_end_of_the_day", phrase: "at the end of the day" },
    { id: "the_key_to_success", phrase: "the key to success" },
    { id: "think_outside_the_box", phrase: "think outside the box" },
    { id: "unlock", phrase: "unlock" },
    { id: "delve", phrase: "delve" },
    { id: "lets_delve", phrase: "let's delve" },
    { id: "excited_to_share", phrase: "excited to share" },
    { id: "key_takeaway", phrase: "key takeaway" },
    { id: "heres_the_thing", phrase: "here's the thing" },
    { id: "without_further_ado", phrase: "without further ado" },
    { id: "mindset", phrase: "mindset" },
    { id: "synergy", phrase: "synergy" },
    { id: "disruptive", phrase: "disruptive" },
  ],
  es: [
    { id: "reducir_la_friccion", phrase: "reducir la fricción" },
    { id: "game_changer", phrase: "game changer" },
    { id: "en_un_mundo_donde", phrase: "en un mundo donde" },
    { id: "en_el_mundo_actual", phrase: "en el mundo actual" },
    { id: "spoiler", phrase: "spoiler:" },
    { id: "al_final_del_dia", phrase: "al final del día" },
    { id: "la_clave_del_exito", phrase: "la clave del éxito" },
    { id: "pensar_fuera_de_la_caja", phrase: "pensar fuera de la caja" },
    { id: "unlock", phrase: "unlock" },
    { id: "profundicemos", phrase: "profundicemos" },
    { id: "emocionado_de_compartir", phrase: "emocionado de compartir" },
    { id: "conclusion_clave", phrase: "conclusión clave" },
    { id: "mindset", phrase: "mindset" },
    { id: "sinergia", phrase: "sinergia" },
    { id: "disruptivo", phrase: "disruptivo" },
  ],
};

/** Cross-language structural patterns (AI tics). */
export const STRUCTURAL_PATTERN_RULES: {
  id: string;
  re: RegExp;
  weight: number;
  maxAllowed?: number;
}[] = [
  {
    id: "not_x_its_y",
    re: /\b(ce n['']est pas|it's not|it is not|no es)\b[^.!?\n]{0,80}\b(c['']est|it's|it is|es)\b/gi,
    weight: 3,
    maxAllowed: 1,
  },
  {
    id: "triple_adjectives",
    re: /\b(\w+),\s+(\w+)\s+et\s+(\w+)\b|\b(\w+),\s+(\w+),\s+and\s+(\w+)\b|\b(\w+),\s+(\w+)\s+y\s+(\w+)\b/gi,
    weight: 2,
  },
];

/** Opinion / first-person markers (positive signals). */
export const OPINION_MARKERS: Record<ContentLanguage, RegExp> = {
  fr: /\b(à mon sens|je pense|je crois|selon moi|franchement|honnêtement|je ne suis pas d'accord|je m'interroge)\b/i,
  en: /\b(in my view|i think|i believe|honestly|frankly|i disagree|i'm not sure|i wonder)\b/i,
  es: /\b(en mi opinión|creo que|pienso que|honestamente|francamente|no estoy de acuerdo|me pregunto)\b/i,
};

/** First-person pronouns (je/nous, I/we, yo/nosotros). */
export const FIRST_PERSON_RE =
  /\b(je|nous|j['']|moi|I|we|my|our|yo|nosotros|nosotras)\b/i;
