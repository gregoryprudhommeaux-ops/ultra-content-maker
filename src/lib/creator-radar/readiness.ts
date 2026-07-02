import { resolveContentNicheFromSteering } from "@/lib/articles/content-niche";
import type { AuthorSteeringPayload } from "@/lib/profile/author-steering-context";

const MIN_PERSONA_CHARS = 120;
const MIN_NICHE_CHARS = 24;

export type CreatorRadarReadinessCode = "needs_persona" | "needs_niche";

export type CreatorRadarReadiness = {
  ok: true;
  niche: string;
} | {
  ok: false;
  code: CreatorRadarReadinessCode;
};

export function assessCreatorRadarContext(
  personaExcerpt: string,
  authorSteering?: AuthorSteeringPayload | null,
): CreatorRadarReadiness {
  const persona = personaExcerpt.trim();
  if (persona.length < MIN_PERSONA_CHARS) {
    return { ok: false, code: "needs_persona" };
  }

  const niche = resolveContentNicheFromSteering(persona, authorSteering).trim();
  if (niche.length < MIN_NICHE_CHARS) {
    return { ok: false, code: "needs_niche" };
  }

  return { ok: true, niche };
}
