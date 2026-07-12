import type { OrganizationTeamMember, RepostSuggestion } from "@/types/workspace";

export function normalizeRepostSuggestions(
  raw: unknown,
  teamMembers: OrganizationTeamMember[],
): RepostSuggestion[] | null {
  if (!Array.isArray(raw) || teamMembers.length === 0) return null;

  const byName = new Map(
    teamMembers.map((m) => [m.name.trim().toLowerCase(), m]),
  );

  const out: RepostSuggestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name =
      typeof o.memberName === "string"
        ? o.memberName.trim()
        : typeof o.name === "string"
          ? o.name.trim()
          : "";
    const repostText =
      typeof o.repostText === "string"
        ? o.repostText.trim()
        : typeof o.text === "string"
          ? o.text.trim()
          : "";
    if (!name || !repostText) continue;

    const member = byName.get(name.toLowerCase());
    if (!member) continue;

    out.push({
      memberName: member.name,
      memberRole: member.role,
      repostText: repostText.slice(0, 600),
    });
  }

  return out.length > 0 ? out : null;
}
