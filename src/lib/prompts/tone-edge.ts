import type { ContentLanguage, ToneEdge } from "@/types/workspace";

const CORROSIVE_INSTRUCTION: Record<ContentLanguage, string> = {
 fr: `Stratégie éditoriale pour CETTE révision uniquement : ton à contre-pied (professionnel).
OBJECTIF : remettre en question une idée reçue du sujet OU un angle « évidence » lié à l'actualité mentionnée · pas autre chose.
- Accroche qui inverse ou bouscule le réflexe automatique du lecteur ; argumentation B2B structurée (constat, « et si », contraste, question rhétorique).
- Rester dans le domaine d'expertise du Persona et le sujet du post.

INTERDIT (non négociable, même « avec humour ») :
- insultes, attaques personnelles, moquerie humiliante ;
- politique, élections, partis, débats sociétaux polarisants ;
- racisme, xénophobie, sexisme, LGBTQ+ bashing, handicap, religion attaquée ;
- contenu haineux, diffamation, provocation gratuite ou cynisme vide.
Si le brouillon actuel touche à ces zones, recentrer sur l'idée reçue métier / l'actualité pro du post sans ces thèmes.`,
 en: `Editorial strategy for THIS revision only: contrarian tone (professional).
GOAL: challenge a received idea on the topic OR an "obvious" angle tied to cited news · nothing else.
- Hook that flips the reader's automatic take; structured B2B argument (observation, "what if", contrast, rhetorical question).
- Stay within the Persona expertise and the post subject.

FORBIDDEN (non-negotiable, even "as a joke"):
- insults, personal attacks, humiliating mockery;
- politics, elections, parties, polarizing social debates;
- racism, xenophobia, sexism, LGBTQ+ bashing, disability slurs, attacked religion;
- hateful content, defamation, empty provocation or hollow cynicism.
If the current draft touches these areas, refocus on professional received wisdom / business news without those themes.`,
 es: `Estrategia editorial solo para ESTA revisión: tono contrario (profesional).
OBJETIVO: cuestionar una idea recibida del tema O un ángulo « obvio » ligado a la actualidad citada · nada más.
- Gancho que invierte el reflejo del lector; argumentación B2B estructurada (constat, « y si », contraste, pregunta retórica).
- Permanecer en la expertise del Persona y el asunto del post.

PROHIBIDO (no negociable, ni « en broma »):
- insultos, ataques personales, burla humillante;
- política, elecciones, partidos, debates sociales polarizados;
- racismo, xenofobia, sexismo, ataques LGBTQ+, discapacidad, religión atacada;
- odio, difamación, provocación vacía o cinismo sin fondo.
Si el borrador toca esas zonas, reenfocar en la idea recibida del negocio / actualidad pro del post sin esos temas.`,
};

export function buildToneEdgeInstruction(
 contentLanguage: ContentLanguage,
 toneEdge: ToneEdge | undefined,
): string | null {
 if (toneEdge !== "corrosive") return null;
 return CORROSIVE_INSTRUCTION[contentLanguage] ?? CORROSIVE_INSTRUCTION.en;
}
