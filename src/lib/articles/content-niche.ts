import { buildPersonaRevealSummary } from "@/lib/persona/extract-persona-summary";
import type { AuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import type { ArticleScope, AudienceProfile, AuthorProfile } from "@/types/workspace";

/** Suggest a niche line from saved audience + persona Topic DNA. */
export function deriveContentNiche(
  audience: AudienceProfile | null,
  author: AuthorProfile | null,
  personaPromptText: string,
): string {
  const saved = audience?.contentNiche?.trim();
  if (saved) return saved;

  const focus = audience?.contentFocus?.trim();
  const target = audience?.targetLabel?.trim();
  if (target && focus) return `${target} · ${focus}`;
  if (focus) return focus;
  if (target) return target;

  const summary = buildPersonaRevealSummary(author, audience, personaPromptText);
  const angle = summary.cards.find((c) => c.key === "angle")?.text?.trim();
  if (angle && angle !== "-") return angle;

  const positioning = summary.cards.find((c) => c.key === "positioning")?.text?.trim();
  return positioning && positioning !== "-" ? positioning : "";
}

export function resolveContentNicheFromSteering(
  personaPromptText: string,
  authorSteering?: AuthorSteeringPayload | null,
): string {
  const saved = authorSteering?.audience?.contentNiche?.trim();
  if (saved) return saved;

  const audienceLike: AudienceProfile | null = authorSteering?.audience
    ? {
        targetLabel: authorSteering.audience.targetLabel,
        contentFocus: authorSteering.audience.contentFocus,
        contentNiche: authorSteering.audience.contentNiche,
        newsInterestQuery: authorSteering.audience.newsInterestQuery,
        optionalNotes: authorSteering.audience.optionalNotes,
        skipped: authorSteering.audience.skipped,
        updatedAt: new Date(),
      }
    : null;

  const authorLike: AuthorProfile | null = authorSteering?.author
    ? {
        roleTitle: authorSteering.author.roleTitle,
        positioningLine: authorSteering.author.positioningLine,
        linkedinProfileUrl: authorSteering.author.linkedinProfileUrl,
        linkedinActivityUrl: authorSteering.author.linkedinActivityUrl,
        websiteUrl: authorSteering.author.websiteUrl,
        blogUrl: authorSteering.author.blogUrl,
        contentLanguage:
          (authorSteering.author.contentLanguage as AuthorProfile["contentLanguage"]) ?? "fr",
        status: "complete",
        updatedAt: new Date(),
      }
    : null;

  return deriveContentNiche(audienceLike, authorLike, personaPromptText);
}

const CONVERSATION_PIPELINE_RULES = `
Reach → conversations → pipeline (when objective is conversation, leads, or authority):
- Reach without conversation is a billboard in the desert — end with one specific question for the target reader (not "What do you think?" engagement bait).
- When it fits the brief, use a soft comment-to-DM loop (e.g. invite a keyword comment to receive a resource) — never hard sell or newsletter pitch in the post body.
- Move attention toward owned channels over time (email/list) in spirit, but do NOT paste signup links in hook/body/PS.`;

export function buildContentNichePromptBlock(
  niche: string,
  targetScope: ArticleScope,
): string {
  const nicheLine =
    niche.trim() ||
    "Infer from Persona Topic DNA and audience — pick ONE reader and ONE problem they lose sleep over.";
  const scopeRule =
    targetScope === "niche"
      ? "FOCUS ON NICHE: laser-focus on the niche statement; ICP-specific pain, expert vocabulary, refuse generic thought leadership."
      : "BROADER WITHIN EXPERTISE: stay inside the author's domain and credibility; explore adjacent angles without diluting into 'writing for everyone'.";

  return `CONTENT NICHE ANCHOR (non-negotiable):
"${nicheLine}"
- Writing for everyone reaches no one — narrow the reader and problem even when the angle feels broad.
- ${scopeRule}
${CONVERSATION_PIPELINE_RULES}`;
}
