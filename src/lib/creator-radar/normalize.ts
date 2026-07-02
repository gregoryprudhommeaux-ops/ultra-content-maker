import type { CreatorFunnelStage, CreatorRadarSuggestion } from "@/types/creator-radar";
import { isLinkedInProfileUrl, normalizeLinkedInProfileUrl } from "./urls";
import { stableCreatorId } from "./stable-id";

const FUNNEL_STAGES = new Set<CreatorFunnelStage>([
  "awareness",
  "consideration",
  "conversion",
]);

function parseFunnelStage(raw: unknown): CreatorFunnelStage {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (FUNNEL_STAGES.has(s as CreatorFunnelStage)) return s as CreatorFunnelStage;
  return "consideration";
}

export const CREATOR_RADAR_COUNT = 3;

export type CreatorNormalizeResult = {
  creators: CreatorRadarSuggestion[];
  rawCount: number;
  rejectedIncomplete: number;
  rejectedInvalidUrl: number;
};

export function normalizeCreatorRadarSuggestions(raw: unknown): CreatorNormalizeResult {
  const empty: CreatorNormalizeResult = {
    creators: [],
    rawCount: 0,
    rejectedIncomplete: 0,
    rejectedInvalidUrl: 0,
  };

  if (!raw || typeof raw !== "object") return empty;
  const list = (raw as { creators?: unknown }).creators ?? raw;
  if (!Array.isArray(list)) return empty;

  const out: CreatorRadarSuggestion[] = [];
  let rejectedIncomplete = 0;
  let rejectedInvalidUrl = 0;

  for (const item of list) {
    if (!item || typeof item !== "object") {
      rejectedIncomplete++;
      continue;
    }
    const row = item as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const headline = typeof row.headline === "string" ? row.headline.trim() : "";
    const linkedinUrl =
      typeof row.linkedinUrl === "string" ? row.linkedinUrl.trim() : "";
    const whyRelevant =
      typeof row.whyRelevant === "string" ? row.whyRelevant.trim() : "";
    const lastPostAngle =
      typeof row.lastPostAngle === "string" ? row.lastPostAngle.trim() : "";

    if (!name || !headline || !linkedinUrl || !whyRelevant || !lastPostAngle) {
      rejectedIncomplete++;
      continue;
    }
    if (!isLinkedInProfileUrl(linkedinUrl)) {
      rejectedInvalidUrl++;
      continue;
    }

    const normalizedUrl = normalizeLinkedInProfileUrl(linkedinUrl);
    out.push({
      id: stableCreatorId(normalizedUrl),
      name,
      headline,
      linkedinUrl: normalizedUrl,
      whyRelevant,
      lastPostAngle,
      funnelStage: parseFunnelStage(row.funnelStage),
    });
  }

  return {
    creators: out.slice(0, CREATOR_RADAR_COUNT),
    rawCount: list.length,
    rejectedIncomplete,
    rejectedInvalidUrl,
  };
}
