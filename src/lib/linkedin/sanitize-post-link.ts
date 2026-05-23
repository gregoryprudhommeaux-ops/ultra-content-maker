/** Generic LinkedIn platform URLs — not useful inside post copy. */
export function isGenericLinkedInPlatformUrl(url: string): boolean {
  const raw = url.trim();
  if (!raw) return false;
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    if (host !== "linkedin.com") return false;

    const path = u.pathname.replace(/\/+$/, "") || "";
    if (!path || path === "") return true;
    if (path === "/feed") return true;
    if (path === "/login") return true;
    return false;
  } catch {
    return /^linkedin\.com\/?$/i.test(raw.replace(/^https?:\/\/(www\.)?/i, ""));
  }
}

export function sanitizeCtaLinkUrl(linkUrl?: string): string | undefined {
  const trimmed = linkUrl?.trim();
  if (!trimmed) return undefined;
  if (isGenericLinkedInPlatformUrl(trimmed)) return undefined;
  return trimmed;
}

/** Remove lines that are only a generic linkedin.com URL. */
export function stripGenericLinkedInUrlsFromText(text: string): string {
  const lines = text.split("\n");
  const filtered = lines.filter((line) => {
    const t = line.trim();
    if (!t) return true;
    if (isGenericLinkedInPlatformUrl(t)) return false;
    return !/\bhttps?:\/\/(?:www\.)?linkedin\.com\/?\s*$/i.test(t);
  });
  return filtered.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
