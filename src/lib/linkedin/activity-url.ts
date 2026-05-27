import { assertSafePublicUrl, isLinkedInUrl } from "@/lib/inspiration/url-safety";

/** LinkedIn public activity feed (recent posts). */
export function isLinkedInActivityUrl(url: string): boolean {
  if (!isLinkedInUrl(url)) return false;
  try {
    const path = new URL(url.trim()).pathname.toLowerCase();
    return (
      path.includes("/recent-activity/") ||
      path.endsWith("/recent-activity") ||
      path.includes("/detail/recent-activity/")
    );
  } catch {
    return false;
  }
}

/** Normalize to https://www.linkedin.com/in/{slug}/recent-activity/all/ when possible. */
export function normalizeLinkedInActivityUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = assertSafePublicUrl(trimmed);
    if (!isLinkedInUrl(url.toString())) return null;

    const path = url.pathname.replace(/\/+$/, "");
    const inMatch = path.match(/^\/in\/([^/]+)(?:\/recent-activity(?:\/all)?)?/i);
    if (inMatch) {
      return `https://www.linkedin.com/in/${inMatch[1]}/recent-activity/all/`;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function validateLinkedInActivityUrl(raw: string): "ok" | "invalid" | "not_activity" {
  const trimmed = raw.trim();
  if (!trimmed) return "ok";
  try {
    assertSafePublicUrl(trimmed);
  } catch {
    return "invalid";
  }
  if (!isLinkedInUrl(trimmed)) return "invalid";
  if (!isLinkedInActivityUrl(trimmed)) return "not_activity";
  return "ok";
}
