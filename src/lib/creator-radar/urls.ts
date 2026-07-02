/** Normalize LinkedIn profile URLs for dedupe and dismiss keys. */
export function normalizeLinkedInProfileUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (!host.endsWith("linkedin.com")) return url.trim().toLowerCase();
    let path = parsed.pathname.replace(/\/+$/, "").toLowerCase();
    if (path.startsWith("/in/")) {
      path = path.split("/").slice(0, 3).join("/");
    }
    return `https://www.linkedin.com${path}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

export function isLinkedInProfileUrl(url: string): boolean {
  const n = normalizeLinkedInProfileUrl(url);
  return /^https:\/\/www\.linkedin\.com\/in\/[^/]+$/i.test(n);
}
