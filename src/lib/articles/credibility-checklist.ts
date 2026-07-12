import type { OrganizationProfile } from "@/types/workspace";

export type CredibilityCheckId =
  | "forbidden_phrases"
  | "stats_policy"
  | "service_scope"
  | "team_names";

export type CredibilityCheckStatus = "pass" | "warn" | "fail" | "skip";

export interface CredibilityCheckResult {
  id: CredibilityCheckId;
  status: CredibilityCheckStatus;
  detail?: string;
}

const STAT_NUMBER_PATTERN =
  /\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?\s*%|\b\d+\s*(?:%|percent|pourcent|pct)\b|\b(?:ROI|KPI|x\d+|×\d+)\b|\b\d+\s*(?:clients?|users?|companies|entreprises|heures?|hours?|days?|jours?)\b/i;

const OVERPROMISE_PATTERNS = [
  /\b24\s*\/\s*7\b/i,
  /\b(?:nationwide|national|worldwide|global|partout|toute la france|todos los países)\b/i,
  /\b(?:guaranteed|garanti|garantizado|100\s*%)\b/i,
  /\b(?:unlimited|illimité|ilimitado)\b/i,
];

function combinedPostText(hook: string, body: string, ps?: string): string {
  return [hook, body, ps].filter(Boolean).join("\n");
}

function checkForbiddenPhrases(
  text: string,
  phrases: string[] | undefined,
): CredibilityCheckResult {
  const list = (phrases ?? []).map((p) => p.trim()).filter(Boolean);
  if (list.length === 0) {
    return { id: "forbidden_phrases", status: "skip" };
  }
  const lower = text.toLowerCase();
  const hits = list.filter((p) => lower.includes(p.toLowerCase()));
  if (hits.length === 0) {
    return { id: "forbidden_phrases", status: "pass" };
  }
  return {
    id: "forbidden_phrases",
    status: "fail",
    detail: hits.slice(0, 3).join(" · "),
  };
}

function checkStatsPolicy(
  text: string,
  policy: OrganizationProfile["statsPolicy"],
): CredibilityCheckResult {
  const hasNumbers = STAT_NUMBER_PATTERN.test(text);
  if (!hasNumbers) {
    return { id: "stats_policy", status: "pass" };
  }
  if (policy === "none") {
    return {
      id: "stats_policy",
      status: "fail",
      detail: "numbers_detected",
    };
  }
  if (policy === "sources_required") {
    const hasSourceCue =
      /\b(source|sources?|selon|d'après|according to|según|étude|study|survey|baromètre|benchmark|rapport|report)\b/i.test(
        text,
      );
    if (!hasSourceCue) {
      return {
        id: "stats_policy",
        status: "fail",
        detail: "source_required",
      };
    }
    return { id: "stats_policy", status: "pass" };
  }
  return {
    id: "stats_policy",
    status: "warn",
    detail: "numbers_detected",
  };
}

function checkServiceScope(
  text: string,
  exclusions: string | undefined,
): CredibilityCheckResult {
  const excl = exclusions?.trim();
  if (!excl) {
    const genericHits = OVERPROMISE_PATTERNS.filter((re) => re.test(text));
    if (genericHits.length === 0) {
      return { id: "service_scope", status: "pass" };
    }
    return { id: "service_scope", status: "warn", detail: "overpromise_risk" };
  }

  const lower = text.toLowerCase();
  const exclLines = excl
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of exclLines) {
    const tokens = line
      .split(/[,;·]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 3);
    for (const token of tokens) {
      if (lower.includes(token.toLowerCase())) {
        return {
          id: "service_scope",
          status: "fail",
          detail: token.slice(0, 80),
        };
      }
    }
  }

  const genericHits = OVERPROMISE_PATTERNS.filter((re) => re.test(text));
  if (genericHits.length > 0) {
    return { id: "service_scope", status: "warn", detail: "overpromise_risk" };
  }

  return { id: "service_scope", status: "pass" };
}

function checkTeamNames(
  text: string,
  teamMembers: OrganizationProfile["teamMembers"],
): CredibilityCheckResult {
  const configured = (teamMembers ?? []).map((m) => m.name.trim()).filter(Boolean);
  if (configured.length === 0) {
    return { id: "team_names", status: "skip" };
  }

  const configuredFull = new Set(configured.map((n) => n.toLowerCase()));
  const configuredLastNames = new Set(
    configured
      .map((name) => {
        const parts = name.split(/\s+/).filter((p) => p.length > 2);
        return parts[parts.length - 1]?.toLowerCase() ?? "";
      })
      .filter(Boolean),
  );

  const unknown: string[] = [];
  const fullNamePattern = /\b([A-ZÀ-ÖØ-Þ][\p{L}'’-]+)\s+([A-ZÀ-ÖØ-Þ][\p{L}'’-]+)\b/gu;
  let match: RegExpExecArray | null;
  while ((match = fullNamePattern.exec(text)) !== null) {
    const full = `${match[1]} ${match[2]}`;
    const lowerFull = full.toLowerCase();
    if (configuredFull.has(lowerFull)) continue;
    if (configuredLastNames.has(match[2]!.toLowerCase())) continue;
    unknown.push(full);
  }

  if (unknown.length > 0) {
    return {
      id: "team_names",
      status: "fail",
      detail: unknown.slice(0, 2).join(" · "),
    };
  }

  return { id: "team_names", status: "pass" };
}

export function runCredibilityChecklist(
  hook: string,
  body: string,
  ps: string | undefined,
  org: OrganizationProfile,
): CredibilityCheckResult[] {
  const text = combinedPostText(hook, body, ps);
  return [
    checkForbiddenPhrases(text, org.forbiddenPhrases),
    checkStatsPolicy(text, org.statsPolicy ?? "none"),
    checkServiceScope(text, org.serviceExclusions),
    checkTeamNames(text, org.teamMembers),
  ];
}

export function credibilityChecklistSummary(
  results: CredibilityCheckResult[],
): { allPass: boolean; hasFail: boolean; hasWarn: boolean; canValidate: boolean } {
  const active = results.filter((r) => r.status !== "skip");
  const hasFail = active.some((r) => r.status === "fail");
  return {
    allPass: active.length > 0 && active.every((r) => r.status === "pass"),
    hasFail,
    hasWarn: active.some((r) => r.status === "warn"),
    canValidate: !hasFail,
  };
}
