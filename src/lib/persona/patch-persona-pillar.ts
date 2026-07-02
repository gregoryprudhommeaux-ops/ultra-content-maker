import { stripVersionHeader } from "@/lib/persona/persona-version";
import type { ContentLanguage } from "@/types/workspace";
import type { PersonaRevealCardKey } from "./extract-persona-summary";
import {
 defaultPillarHeading,
 PERSONA_PILLAR_HEADINGS,
} from "./persona-section-headings";

function escapeRegExp(value: string): string {
 return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findSectionBounds(
 promptText: string,
 headings: readonly string[],
): { start: number; bodyStart: number; bodyEnd: number } | null {
 for (const heading of headings) {
 const re = new RegExp(`^##\\s*${escapeRegExp(heading)}\\s*$`, "im");
 const match = re.exec(promptText);
 if (!match || match.index === undefined) continue;
 const bodyStart = match.index + match[0].length;
 const rest = promptText.slice(bodyStart);
 const nextHeading = rest.search(/^##\s/m);
 const bodyEnd =
 nextHeading === -1 ? promptText.length : bodyStart + nextHeading;
 return { start: match.index, bodyStart, bodyEnd };
 }
 return null;
}

/** Turn edited pillar text back into markdown section body. */
export function pillarTextToSectionBody(text: string): string {
 const trimmed = text.trim();
 if (!trimmed || trimmed === "-") return "- ";
 if (trimmed.includes("\n")) return trimmed;
 const parts = trimmed.split(/\s*·\s*/).filter(Boolean);
 if (parts.length > 1) {
 return parts.map((part) => `- ${part.trim()}`).join("\n");
 }
 if (/^[-*•]\s+/.test(trimmed)) return trimmed;
 return `- ${trimmed}`;
}

export function patchPersonaPromptSection(
 promptText: string,
 key: PersonaRevealCardKey,
 newText: string,
 contentLanguage: ContentLanguage = "en",
): string {
 const body = pillarTextToSectionBody(newText);
 const stripped = stripVersionHeader(promptText);
 const bounds = findSectionBounds(stripped, PERSONA_PILLAR_HEADINGS[key]);

 if (bounds) {
 const before = stripped.slice(0, bounds.bodyStart);
 const after = stripped.slice(bounds.bodyEnd);
 const patched = `${before}\n\n${body}\n\n${after}`.replace(/\n{3,}/g, "\n\n").trim();
 return patched;
 }

 const heading = defaultPillarHeading(key, contentLanguage);
 const suffix = stripped.trim();
 return suffix
 ? `${suffix}\n\n## ${heading}\n\n${body}`
 : `## ${heading}\n\n${body}`;
}
