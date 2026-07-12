import type {
  EditorialCalendarEntry,
  EditorialCalendarEntryStatus,
  EditorialPillar,
  GapAnswerValue,
  LinkedInAnalyticsMonthlySummary,
  OrganizationProfile,
  OrganizationTeamMember,
  PublishedTopicEntry,
} from "@/types/workspace";

export const ORGANIZATION_ENRICHMENT_KEYS = {
  organizationProfile: "organization_profile",
  editorialPillars: "editorial_pillars",
  publishedTopics: "published_topics",
  editorialCalendar: "editorial_calendar",
  linkedInAnalyticsSummary: "linkedin_analytics_summary",
} as const;

export const MAX_EDITORIAL_PILLARS = 7;
export const MAX_PUBLISHED_TOPICS = 40;
export const MAX_TEAM_MEMBERS = 8;
export const MAX_EDITORIAL_CALENDAR_ENTRIES = 24;
export const MAX_ANALYTICS_MONTHS = 12;

function readString(details: Record<string, GapAnswerValue>, key: string): string {
  const v = details[key];
  if (typeof v === "string") return v.trim();
  return "";
}

function parseJsonArray<T>(raw: string, guard: (item: unknown) => T | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(guard).filter((x): x is T => x !== null);
  } catch {
    return [];
  }
}

function linesToList(text: string | undefined): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export function emptyOrganizationProfile(): OrganizationProfile {
  return {
    centralMessage: "",
    whatWeAreNot: "",
    clientSegments: [],
    teamMembers: [],
    serviceScope: "",
    serviceExclusions: "",
    forbiddenPhrases: [],
    preferredPhrases: [],
    statsPolicy: "none",
    linkedInPresence: "company_page",
    visualFirst: true,
  };
}

export function parseOrganizationProfile(
  details: Record<string, GapAnswerValue> | null | undefined,
): OrganizationProfile {
  const raw = readString(details ?? {}, ORGANIZATION_ENRICHMENT_KEYS.organizationProfile);
  if (!raw) return emptyOrganizationProfile();

  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== "object") return emptyOrganizationProfile();

    const teamRaw = o.teamMembers;
    const teamMembers: OrganizationTeamMember[] = Array.isArray(teamRaw)
      ? teamRaw
          .map((m): OrganizationTeamMember | null => {
            if (!m || typeof m !== "object") return null;
            const t = m as Record<string, unknown>;
            const name = typeof t.name === "string" ? t.name.trim() : "";
            const role = typeof t.role === "string" ? t.role.trim() : "";
            if (!name) return null;
            return { name, role };
          })
          .filter((m): m is OrganizationTeamMember => m !== null)
          .slice(0, MAX_TEAM_MEMBERS)
      : [];

    return {
      centralMessage: typeof o.centralMessage === "string" ? o.centralMessage.trim() : "",
      whatWeAreNot: typeof o.whatWeAreNot === "string" ? o.whatWeAreNot.trim() : "",
      clientSegments: Array.isArray(o.clientSegments)
        ? o.clientSegments.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        : [],
      teamMembers,
      serviceScope: typeof o.serviceScope === "string" ? o.serviceScope.trim() : "",
      serviceExclusions:
        typeof o.serviceExclusions === "string" ? o.serviceExclusions.trim() : "",
      forbiddenPhrases: Array.isArray(o.forbiddenPhrases)
        ? o.forbiddenPhrases.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        : [],
      preferredPhrases: Array.isArray(o.preferredPhrases)
        ? o.preferredPhrases.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        : [],
      statsPolicy:
        o.statsPolicy === "validated_only" || o.statsPolicy === "sources_required"
          ? o.statsPolicy
          : "none",
      linkedInPresence:
        o.linkedInPresence === "leader" ||
        o.linkedInPresence === "hybrid" ||
        o.linkedInPresence === "agency_managed"
          ? o.linkedInPresence
          : "company_page",
      visualFirst: o.visualFirst !== false,
    };
  } catch {
    return emptyOrganizationProfile();
  }
}

export function organizationProfileToEnrichmentPatch(
  profile: OrganizationProfile,
): Record<string, GapAnswerValue> {
  const trimmed: OrganizationProfile = {
    ...profile,
    centralMessage: profile.centralMessage?.trim() ?? "",
    whatWeAreNot: profile.whatWeAreNot?.trim() ?? "",
    clientSegments: (profile.clientSegments ?? []).map((s) => s.trim()).filter(Boolean),
    teamMembers: (profile.teamMembers ?? [])
      .map((m) => ({ name: m.name.trim(), role: m.role.trim() }))
      .filter((m) => m.name.length > 0)
      .slice(0, MAX_TEAM_MEMBERS),
    serviceScope: profile.serviceScope?.trim() ?? "",
    serviceExclusions: profile.serviceExclusions?.trim() ?? "",
    forbiddenPhrases: (profile.forbiddenPhrases ?? []).map((s) => s.trim()).filter(Boolean),
    preferredPhrases: (profile.preferredPhrases ?? []).map((s) => s.trim()).filter(Boolean),
  };

  const hasContent =
    trimmed.centralMessage ||
    trimmed.whatWeAreNot ||
    (trimmed.clientSegments?.length ?? 0) > 0 ||
    (trimmed.teamMembers?.length ?? 0) > 0 ||
    trimmed.serviceScope ||
    trimmed.serviceExclusions ||
    (trimmed.forbiddenPhrases?.length ?? 0) > 0 ||
    (trimmed.preferredPhrases?.length ?? 0) > 0;

  if (!hasContent) {
    return { [ORGANIZATION_ENRICHMENT_KEYS.organizationProfile]: "" };
  }

  return {
    [ORGANIZATION_ENRICHMENT_KEYS.organizationProfile]: JSON.stringify(trimmed),
  };
}

export function parseEditorialPillars(
  details: Record<string, GapAnswerValue> | null | undefined,
): EditorialPillar[] {
  const raw = readString(details ?? {}, ORGANIZATION_ENRICHMENT_KEYS.editorialPillars);
  return parseJsonArray(raw, (item): EditorialPillar | null => {
    if (!item || typeof item !== "object") return null;
    const o = item as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    if (!label) return null;
    const id =
      typeof o.id === "string" && o.id.trim()
        ? o.id.trim()
        : label.toLowerCase().replace(/\s+/g, "_").slice(0, 48);
    const exampleTopics = Array.isArray(o.exampleTopics)
      ? o.exampleTopics.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      : [];
    return {
      id,
      label,
      description: typeof o.description === "string" ? o.description.trim() : "",
      exampleTopics,
    };
  }).slice(0, MAX_EDITORIAL_PILLARS);
}

export function editorialPillarsToEnrichmentPatch(
  pillars: EditorialPillar[],
): Record<string, GapAnswerValue> {
  const trimmed = pillars
    .map((p) => ({
      id: p.id.trim() || p.label.toLowerCase().replace(/\s+/g, "_").slice(0, 48),
      label: p.label.trim(),
      description: p.description?.trim() ?? "",
      exampleTopics: (p.exampleTopics ?? []).map((t) => t.trim()).filter(Boolean),
    }))
    .filter((p) => p.label.length > 0)
    .slice(0, MAX_EDITORIAL_PILLARS);

  if (trimmed.length === 0) {
    return { [ORGANIZATION_ENRICHMENT_KEYS.editorialPillars]: "" };
  }

  return {
    [ORGANIZATION_ENRICHMENT_KEYS.editorialPillars]: JSON.stringify(trimmed),
  };
}

export function parsePublishedTopics(
  details: Record<string, GapAnswerValue> | null | undefined,
): PublishedTopicEntry[] {
  const raw = readString(details ?? {}, ORGANIZATION_ENRICHMENT_KEYS.publishedTopics);
  return parseJsonArray(raw, (item): PublishedTopicEntry | null => {
    if (!item || typeof item !== "object") return null;
    const o = item as Record<string, unknown>;
    const articleId = typeof o.articleId === "string" ? o.articleId.trim() : "";
    const headline = typeof o.headline === "string" ? o.headline.trim() : "";
    const summary = typeof o.summary === "string" ? o.summary.trim() : "";
    const publishedAt = typeof o.publishedAt === "string" ? o.publishedAt : "";
    if (!articleId || !headline) return null;
    return {
      articleId,
      headline,
      summary: summary || headline,
      pillarId: typeof o.pillarId === "string" ? o.pillarId.trim() : undefined,
      publishedAt: publishedAt || new Date().toISOString(),
    };
  })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, MAX_PUBLISHED_TOPICS);
}

export function publishedTopicsToEnrichmentPatch(
  topics: PublishedTopicEntry[],
): Record<string, GapAnswerValue> {
  const trimmed = topics.slice(0, MAX_PUBLISHED_TOPICS);
  return {
    [ORGANIZATION_ENRICHMENT_KEYS.publishedTopics]: JSON.stringify(trimmed),
  };
}

export function appendPublishedTopic(
  existing: PublishedTopicEntry[],
  entry: PublishedTopicEntry,
): PublishedTopicEntry[] {
  const without = existing.filter((t) => t.articleId !== entry.articleId);
  return [entry, ...without].slice(0, MAX_PUBLISHED_TOPICS);
}

function newCalendarEntryId(): string {
  return `cal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyEditorialCalendarEntry(): EditorialCalendarEntry {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: newCalendarEntryId(),
    pillarId: "",
    plannedDate: today,
    topicHint: "",
    status: "planned",
  };
}

export function parseEditorialCalendar(
  details: Record<string, GapAnswerValue> | null | undefined,
): EditorialCalendarEntry[] {
  const raw = readString(details ?? {}, ORGANIZATION_ENRICHMENT_KEYS.editorialCalendar);
  return parseJsonArray(raw, (item): EditorialCalendarEntry | null => {
    if (!item || typeof item !== "object") return null;
    const o = item as Record<string, unknown>;
    const pillarId = typeof o.pillarId === "string" ? o.pillarId.trim() : "";
    const plannedDate = typeof o.plannedDate === "string" ? o.plannedDate.trim() : "";
    if (!pillarId || !plannedDate) return null;
    const statusRaw = o.status;
    const status: EditorialCalendarEntryStatus =
      statusRaw === "in_progress" || statusRaw === "published" ? statusRaw : "planned";
    const id =
      typeof o.id === "string" && o.id.trim() ? o.id.trim() : newCalendarEntryId();
    return {
      id,
      pillarId,
      plannedDate,
      topicHint: typeof o.topicHint === "string" ? o.topicHint.trim() : "",
      status,
    };
  })
    .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate))
    .slice(0, MAX_EDITORIAL_CALENDAR_ENTRIES);
}

/** Mark the first matching planned/in_progress calendar slot as published. */
export function markCalendarEntryPublished(
  entries: EditorialCalendarEntry[],
  pillarId: string,
): EditorialCalendarEntry[] {
  const id = pillarId.trim();
  if (!id) return entries;
  let marked = false;
  const next = entries.map((e) => {
    if (marked) return e;
    if (
      e.pillarId === id &&
      (e.status === "planned" || e.status === "in_progress")
    ) {
      marked = true;
      return { ...e, status: "published" as const };
    }
    return e;
  });
  return marked ? next : entries;
}

export function editorialCalendarToEnrichmentPatch(
  entries: EditorialCalendarEntry[],
): Record<string, GapAnswerValue> {
  const trimmed = entries
    .map((e) => ({
      id: e.id.trim() || newCalendarEntryId(),
      pillarId: e.pillarId.trim(),
      plannedDate: e.plannedDate.trim(),
      topicHint: e.topicHint?.trim() ?? "",
      status: e.status,
    }))
    .filter((e) => e.pillarId.length > 0 && e.plannedDate.length > 0)
    .slice(0, MAX_EDITORIAL_CALENDAR_ENTRIES);

  if (trimmed.length === 0) {
    return { [ORGANIZATION_ENRICHMENT_KEYS.editorialCalendar]: "" };
  }

  return {
    [ORGANIZATION_ENRICHMENT_KEYS.editorialCalendar]: JSON.stringify(trimmed),
  };
}

export function parseLinkedInAnalyticsSummary(
  details: Record<string, GapAnswerValue> | null | undefined,
): LinkedInAnalyticsMonthlySummary[] {
  const raw = readString(details ?? {}, ORGANIZATION_ENRICHMENT_KEYS.linkedInAnalyticsSummary);
  return parseJsonArray(raw, (item): LinkedInAnalyticsMonthlySummary | null => {
    if (!item || typeof item !== "object") return null;
    const o = item as Record<string, unknown>;
    const month = typeof o.month === "string" ? o.month.trim() : "";
    if (!/^\d{4}-\d{2}$/.test(month)) return null;
    const num = (v: unknown) =>
      typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : undefined;
    return {
      month,
      totalImpressions: num(o.totalImpressions),
      totalReactions: num(o.totalReactions),
      totalComments: num(o.totalComments),
      notes: typeof o.notes === "string" ? o.notes.trim() : "",
    };
  })
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, MAX_ANALYTICS_MONTHS);
}

export function linkedInAnalyticsSummaryToEnrichmentPatch(
  months: LinkedInAnalyticsMonthlySummary[],
): Record<string, GapAnswerValue> {
  const trimmed = months
    .filter((m) => /^\d{4}-\d{2}$/.test(m.month))
    .slice(0, MAX_ANALYTICS_MONTHS);

  if (trimmed.length === 0) {
    return { [ORGANIZATION_ENRICHMENT_KEYS.linkedInAnalyticsSummary]: "" };
  }

  return {
    [ORGANIZATION_ENRICHMENT_KEYS.linkedInAnalyticsSummary]: JSON.stringify(trimmed),
  };
}

/** Pillar ids used in the last N published topics (most recent first). */
export function recentPublishedPillarIds(
  topics: PublishedTopicEntry[],
  limit = 3,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of topics) {
    const id = t.pillarId?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= limit) break;
  }
  return out;
}

/** Calendar entries due within the next N days (planned or in_progress). */
export function upcomingCalendarEntries(
  entries: EditorialCalendarEntry[],
  withinDays = 14,
): EditorialCalendarEntry[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + withinDays);

  return entries.filter((e) => {
    if (e.status === "published") return false;
    const d = new Date(`${e.plannedDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return false;
    return d >= today && d <= cutoff;
  });
}

export function buildEditorialCalendarPromptBlock(
  details: Record<string, GapAnswerValue> | null | undefined,
): string | null {
  const pillars = parseEditorialPillars(details);
  const calendar = parseEditorialCalendar(details);
  const published = parsePublishedTopics(details);
  const recentPillars = recentPublishedPillarIds(published);
  const upcoming = upcomingCalendarEntries(calendar);

  if (pillars.length === 0 && calendar.length === 0) return null;

  const lines: string[] = ["EDITORIAL CALENDAR & PILLAR ROTATION:"];

  if (recentPillars.length > 0) {
    const labels = recentPillars
      .map((id) => pillars.find((p) => p.id === id)?.label ?? id)
      .join(", ");
    lines.push(`Recently used pillars (avoid repeating next): ${labels}`);
  }

  const unusedPillars = pillars.filter((p) => !recentPillars.includes(p.id));
  if (unusedPillars.length > 0) {
    lines.push(
      `Prefer pillars not used recently: ${unusedPillars.map((p) => p.label).join(" · ")}`,
    );
  }

  if (upcoming.length > 0) {
    lines.push("Upcoming planned posts (align topic if due):");
    for (const e of upcoming.slice(0, 5)) {
      const label = pillars.find((p) => p.id === e.pillarId)?.label ?? e.pillarId;
      const hint = e.topicHint ? ` · topic: ${e.topicHint}` : "";
      lines.push(`- ${e.plannedDate} · pillar "${label}"${hint}`);
    }
  }

  return lines.join("\n");
}

export function listToTextareaLines(items: string[] | undefined): string {
  return (items ?? []).join("\n");
}

export function textareaLinesToList(text: string): string[] {
  return linesToList(text);
}

export function hasOrganizationContent(profile: OrganizationProfile): boolean {
  return Boolean(
    profile.centralMessage?.trim() ||
      profile.whatWeAreNot?.trim() ||
      (profile.clientSegments?.length ?? 0) > 0 ||
      profile.serviceScope?.trim() ||
      profile.serviceExclusions?.trim() ||
      (profile.forbiddenPhrases?.length ?? 0) > 0 ||
      (profile.preferredPhrases?.length ?? 0) > 0,
  );
}

export function buildOrganizationPromptBlock(
  details: Record<string, GapAnswerValue> | null | undefined,
): string | null {
  const org = parseOrganizationProfile(details);
  const pillars = parseEditorialPillars(details);
  if (!hasOrganizationContent(org) && pillars.length === 0) return null;

  const lines: string[] = ["ORGANIZATION & CREDIBILITY (mandatory for company/product-service posts):"];

  if (org.centralMessage) {
    lines.push(`Central message: ${org.centralMessage}`);
  }
  if (org.whatWeAreNot) {
    lines.push(`What we are NOT: ${org.whatWeAreNot}`);
  }
  if (org.clientSegments?.length) {
    lines.push(`Target segments: ${org.clientSegments.join(" · ")}`);
  }
  if (org.serviceScope) {
    lines.push(`Service scope (what we do): ${org.serviceScope}`);
  }
  if (org.serviceExclusions) {
    lines.push(`Out of scope (never promise): ${org.serviceExclusions}`);
  }
  if (org.teamMembers?.length) {
    lines.push(
      `Team (real structure · do not exaggerate): ${org.teamMembers.map((m) => `${m.name} (${m.role})`).join(" · ")}`,
    );
  }
  if (org.forbiddenPhrases?.length) {
    lines.push(`NEVER use these phrases: ${org.forbiddenPhrases.map((p) => `"${p}"`).join(", ")}`);
  }
  if (org.preferredPhrases?.length) {
    lines.push(`Prefer formulations like: ${org.preferredPhrases.map((p) => `"${p}"`).join(", ")}`);
  }
  if (org.statsPolicy === "none") {
    lines.push("Stats policy: NO numbers, percentages, or ROI claims unless explicitly provided in the brief.");
  } else if (org.statsPolicy === "validated_only") {
    lines.push("Stats policy: only use numbers from the validated stats list in profile enrichment.");
  } else {
    lines.push("Stats policy: any number must cite a named source in the post.");
  }
  if (org.visualFirst) {
    lines.push(
      "Visual-first mode: keep hook+body short (roughly 600-900 characters total) · one strong idea · assume a premium infographic or diagram carries the detail.",
    );
  }
  if (pillars.length > 0) {
    lines.push("Editorial pillars (rotate · do not repeat same pillar twice in a row):");
    for (const p of pillars) {
      const examples =
        p.exampleTopics?.length ? ` · examples: ${p.exampleTopics.join("; ")}` : "";
      lines.push(`- ${p.label}${p.description ? `: ${p.description}` : ""}${examples}`);
    }
  }

  return lines.join("\n");
}

export function buildPublishedTopicsAvoidanceBlock(
  details: Record<string, GapAnswerValue> | null | undefined,
): string | null {
  const topics = parsePublishedTopics(details);
  if (topics.length === 0) return null;

  const lines = topics.slice(0, 20).map((t) => `- ${t.headline}${t.summary !== t.headline ? ` (${t.summary.slice(0, 120)})` : ""}`);
  return `ALREADY PUBLISHED TOPICS (do NOT repeat or publish close variants):\n${lines.join("\n")}`;
}

export function organizationEnrichmentPatch(
  org: OrganizationProfile,
  pillars: EditorialPillar[],
  calendar?: EditorialCalendarEntry[],
  analyticsSummary?: LinkedInAnalyticsMonthlySummary[],
): Record<string, GapAnswerValue> {
  return {
    ...organizationProfileToEnrichmentPatch(org),
    ...editorialPillarsToEnrichmentPatch(pillars),
    ...(calendar ? editorialCalendarToEnrichmentPatch(calendar) : {}),
    ...(analyticsSummary ? linkedInAnalyticsSummaryToEnrichmentPatch(analyticsSummary) : {}),
  };
}

export function showsOrganizationProfileFields(
  archetype: import("@/types/workspace").ContentArchetype | undefined,
): boolean {
  return archetype === "founder_product" || archetype === "hybrid";
}
