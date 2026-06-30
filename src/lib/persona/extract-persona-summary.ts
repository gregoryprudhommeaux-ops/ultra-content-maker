import { stripVersionHeader } from "@/lib/persona/persona-version";
import type { AudienceProfile, AuthorProfile } from "@/types/workspace";
import { PERSONA_PILLAR_HEADINGS } from "./persona-section-headings";

export type PersonaRevealCardKey = "positioning" | "audience" | "angle" | "tone";

export type PersonaRevealCard = {
  key: PersonaRevealCardKey;
  text: string;
  /** Where the summary text was derived from. */
  source: "profile" | "persona";
};

export type PersonaRevealSummary = {
  cards: PersonaRevealCard[];
};

function truncate(text: string, max = 260): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).trim()}…`;
}

function extractSection(promptText: string, headings: readonly string[]): string | null {
  const text = stripVersionHeader(promptText);
  for (const heading of headings) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^##\\s*${escaped}\\s*$`, "im");
    const match = re.exec(text);
    if (!match || match.index === undefined) continue;
    const start = match.index + match[0].length;
    const rest = text.slice(start);
    const nextHeading = rest.search(/^##\s/m);
    const body = (nextHeading === -1 ? rest : rest.slice(0, nextHeading)).trim();
    if (body) return body;
  }
  return null;
}

function firstBullets(section: string, maxItems = 2): string {
  const bullets = section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*•]\s+/.test(line))
    .map((line) => line.replace(/^[-*•]\s+/, "").trim())
    .filter(Boolean);
  if (bullets.length > 0) {
    return bullets.slice(0, maxItems).join(" · ");
  }
  return truncate(section.split("\n\n")[0] ?? section, 220);
}

function positioningFromProfile(author: AuthorProfile | null): string | null {
  const role = author?.roleTitle?.trim();
  const line = author?.positioningLine?.trim();
  if (line && role) return `${role} — ${line}`;
  return line || role || null;
}

function audienceFromProfile(audience: AudienceProfile | null): string | null {
  if (!audience || audience.skipped) return null;
  const target = audience.targetLabel?.trim();
  const focus = audience.contentFocus?.trim();
  if (target && focus) return `${target}. ${focus}`;
  return target || focus || null;
}

export function buildPersonaRevealSummary(
  author: AuthorProfile | null,
  audience: AudienceProfile | null,
  promptText: string,
): PersonaRevealSummary {
  const hasPrompt = promptText.trim().length > 0;

  const authorSection = hasPrompt
    ? extractSection(promptText, PERSONA_PILLAR_HEADINGS.positioning)
    : null;

  const audienceSection = hasPrompt
    ? extractSection(promptText, PERSONA_PILLAR_HEADINGS.audience)
    : null;

  const topicSection = hasPrompt
    ? extractSection(promptText, PERSONA_PILLAR_HEADINGS.angle)
    : null;

  const voiceSection = hasPrompt
    ? extractSection(promptText, PERSONA_PILLAR_HEADINGS.tone)
    : null;

  const positioningProfile = positioningFromProfile(author);
  const positioningText =
    (authorSection ? firstBullets(authorSection, 2) : null) ||
    positioningProfile ||
    (hasPrompt ? truncate(stripVersionHeader(promptText), 180) : "—");

  const audienceProfile = audienceFromProfile(audience);
  const audienceText =
    audienceSection
      ? firstBullets(audienceSection, 2)
      : audienceProfile ||
        (audience?.skipped ? null : null);

  const angleText = topicSection
    ? firstBullets(topicSection, 2)
    : author?.positioningLine?.trim() || positioningProfile || "—";

  const toneText = voiceSection
    ? firstBullets(voiceSection, 2) || truncate(voiceSection, 220)
    : authorSection
      ? truncate(authorSection.split("\n").slice(-2).join(" "), 220)
      : "—";

  return {
    cards: [
      {
        key: "positioning",
        text: truncate(positioningText),
        source: authorSection || !positioningProfile ? "persona" : "profile",
      },
      {
        key: "audience",
        text: audienceText ? truncate(audienceText) : "",
        source: audienceSection || !audienceProfile ? "persona" : "profile",
      },
      {
        key: "angle",
        text: truncate(angleText),
        source: topicSection ? "persona" : "profile",
      },
      {
        key: "tone",
        text: truncate(toneText),
        source: voiceSection ? "persona" : "profile",
      },
    ],
  };
}
