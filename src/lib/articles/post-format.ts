import type { LinkedInPostFormat, PostFormatPlan } from "@/types/workspace";

export const LINKEDIN_POST_FORMATS: LinkedInPostFormat[] = [
 "text_post",
 "carousel",
 "short_video",
];

export function isLinkedInPostFormat(v: string): v is LinkedInPostFormat {
 return (LINKEDIN_POST_FORMATS as readonly string[]).includes(v);
}

export function normalizePostFormatPlan(raw: unknown): PostFormatPlan | undefined {
 if (!raw || typeof raw !== "object") return undefined;
 const o = raw as Record<string, unknown>;
 const primary = o.primaryFormat;
 if (typeof primary !== "string" || !isLinkedInPostFormat(primary)) return undefined;
 const rationale = typeof o.rationale === "string" ? o.rationale.trim() : "";
 const altRaw = o.alternativeFormats;
 const alternativeFormats = Array.isArray(altRaw)
 ? altRaw
 .filter((f): f is LinkedInPostFormat => isLinkedInPostFormat(String(f)))
 .filter((f) => f !== primary)
 .slice(0, 2)
 : undefined;
 return {
 primaryFormat: primary,
 rationale: rationale || "-",
 alternativeFormats: alternativeFormats?.length ? alternativeFormats : undefined,
 };
}
