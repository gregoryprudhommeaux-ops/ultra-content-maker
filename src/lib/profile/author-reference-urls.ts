import {
  isLinkedInPostsFeedUrl,
  normalizeLinkedInPostsFeedUrl,
  validateLinkedInPostsFeedUrl,
} from "@/lib/linkedin/activity-url";
import { isValidUrl } from "@/lib/workspace/firestore-utils";
import type { AuthorProfile, AuthorReferenceUrl, AuthorReferenceUrlKind } from "@/types/workspace";

export const MAX_LINKEDIN_ACTIVITY_SOURCES = 5;
export const MAX_WEB_SOURCES = 8;

const LINKEDIN_KINDS: AuthorReferenceUrlKind[] = [
  "linkedin_personal",
  "linkedin_company",
];

const WEB_KINDS: AuthorReferenceUrlKind[] = ["website", "blog", "other"];

export function isLinkedInReferenceKind(
  kind: AuthorReferenceUrlKind,
): kind is "linkedin_personal" | "linkedin_company" {
  return kind === "linkedin_personal" || kind === "linkedin_company";
}

export function normalizeAuthorReferenceUrl(raw: unknown): AuthorReferenceUrl | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const url = typeof item.url === "string" ? item.url.trim() : "";
  if (!url) return null;
  const kind = item.kind as AuthorReferenceUrlKind;
  if (![...LINKEDIN_KINDS, ...WEB_KINDS].includes(kind)) return null;
  const label = typeof item.label === "string" ? item.label.trim() : "";
  return { url, kind, ...(label ? { label } : {}) };
}

function dedupeSources(items: AuthorReferenceUrl[]): AuthorReferenceUrl[] {
  const seen = new Set<string>();
  const out: AuthorReferenceUrl[] = [];
  for (const item of items) {
    const key = item.url.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function migrateLinkedInActivitySources(
  profile: Pick<AuthorProfile, "linkedinActivitySources" | "linkedinActivityUrl"> | null | undefined,
): AuthorReferenceUrl[] {
  const fromArray = (profile?.linkedinActivitySources ?? [])
    .map(normalizeAuthorReferenceUrl)
    .filter((item): item is AuthorReferenceUrl => item !== null && isLinkedInReferenceKind(item.kind));
  if (fromArray.length > 0) return dedupeSources(fromArray).slice(0, MAX_LINKEDIN_ACTIVITY_SOURCES);

  const legacy = profile?.linkedinActivityUrl?.trim();
  if (!legacy) return [];
  return [
    {
      url: legacy,
      kind: legacy.includes("/company/") ? "linkedin_company" : "linkedin_personal",
    },
  ];
}

export function migrateWebSources(
  profile: Pick<AuthorProfile, "webSources" | "websiteUrl" | "blogUrl"> | null | undefined,
): AuthorReferenceUrl[] {
  const fromArray = (profile?.webSources ?? [])
    .map(normalizeAuthorReferenceUrl)
    .filter(
      (item): item is AuthorReferenceUrl =>
        item !== null && WEB_KINDS.includes(item.kind as (typeof WEB_KINDS)[number]),
    );
  if (fromArray.length > 0) return dedupeSources(fromArray).slice(0, MAX_WEB_SOURCES);

  const out: AuthorReferenceUrl[] = [];
  const website = profile?.websiteUrl?.trim();
  const blog = profile?.blogUrl?.trim();
  if (website) out.push({ url: website, kind: "website" });
  if (blog) out.push({ url: blog, kind: "blog" });
  return dedupeSources(out);
}

export function linkedInActivityUrlsFromProfile(
  profile: Pick<AuthorProfile, "linkedinActivitySources" | "linkedinActivityUrl"> | null | undefined,
): string[] {
  return migrateLinkedInActivitySources(profile).map((item) => item.url);
}

export function activityUrlsFingerprint(urls: string[]): string {
  return [...new Set(urls.map((u) => u.trim().toLowerCase()).filter(Boolean))]
    .sort()
    .join("|");
}

export function validateWebReferenceUrl(url: string): "ok" | "invalid" {
  const trimmed = url.trim();
  if (!trimmed) return "invalid";
  return isValidUrl(trimmed) ? "ok" : "invalid";
}

export function validateAuthorReferenceUrl(
  kind: AuthorReferenceUrlKind,
  url: string,
): "ok" | "invalid" | "not_activity" {
  const trimmed = url.trim();
  if (!trimmed) return "invalid";
  if (isLinkedInReferenceKind(kind)) {
    return validateLinkedInPostsFeedUrl(trimmed);
  }
  return validateWebReferenceUrl(trimmed) === "ok" ? "ok" : "invalid";
}

export function normalizeAuthorReferenceUrlForSave(
  kind: AuthorReferenceUrlKind,
  url: string,
): string {
  const trimmed = url.trim();
  if (isLinkedInReferenceKind(kind)) {
    return normalizeLinkedInPostsFeedUrl(trimmed) ?? trimmed;
  }
  return trimmed;
}

export function legacyAuthorUrlFieldsFromSources(input: {
  linkedinActivitySources: AuthorReferenceUrl[];
  webSources: AuthorReferenceUrl[];
}): Pick<AuthorProfile, "linkedinActivityUrl" | "websiteUrl" | "blogUrl"> {
  const firstActivity = input.linkedinActivitySources[0]?.url;
  const website =
    input.webSources.find((s) => s.kind === "website")?.url ??
    input.webSources[0]?.url;
  const blog = input.webSources.find((s) => s.kind === "blog")?.url;
  return {
    linkedinActivityUrl: firstActivity,
    websiteUrl: website,
    blogUrl: blog,
  };
}
