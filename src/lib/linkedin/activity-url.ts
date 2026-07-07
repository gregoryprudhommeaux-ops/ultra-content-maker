import { assertSafePublicUrl, isLinkedInUrl } from "@/lib/inspiration/url-safety";

/** LinkedIn personal public activity feed (recent posts). */
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

/** LinkedIn company page posts feed. */
export function isLinkedInCompanyPostsUrl(url: string): boolean {
  if (!isLinkedInUrl(url)) return false;
  try {
    const path = new URL(url.trim()).pathname.toLowerCase();
    return /^\/company\/[^/]+\/posts\/?/i.test(path);
  } catch {
    return false;
  }
}

/** Personal activity feed or company posts feed. */
export function isLinkedInPostsFeedUrl(url: string): boolean {
  return isLinkedInActivityUrl(url) || isLinkedInCompanyPostsUrl(url);
}

/** Normalize personal activity or company posts feed URL when possible. */
export function normalizeLinkedInPostsFeedUrl(raw: string): string | null {
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

    const companyMatch = path.match(/^\/company\/([^/]+)\/posts/i);
    if (companyMatch) {
      return `https://www.linkedin.com/company/${companyMatch[1]}/posts/?feedView=all`;
    }

    return url.toString();
  } catch {
    return null;
  }
}

/** @deprecated Use normalizeLinkedInPostsFeedUrl */
export function normalizeLinkedInActivityUrl(raw: string): string | null {
  return normalizeLinkedInPostsFeedUrl(raw);
}

export function validateLinkedInPostsFeedUrl(raw: string): "ok" | "invalid" | "not_activity" {
  const trimmed = raw.trim();
  if (!trimmed) return "ok";
  try {
    assertSafePublicUrl(trimmed);
  } catch {
    return "invalid";
  }
  if (!isLinkedInUrl(trimmed)) return "invalid";
  if (!isLinkedInPostsFeedUrl(trimmed)) return "not_activity";
  return "ok";
}

/** @deprecated Use validateLinkedInPostsFeedUrl */
export function validateLinkedInActivityUrl(raw: string): "ok" | "invalid" | "not_activity" {
  return validateLinkedInPostsFeedUrl(raw);
}
