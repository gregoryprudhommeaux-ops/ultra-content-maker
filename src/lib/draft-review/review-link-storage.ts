const KEY_PREFIX = "ucm:draft-review-url:";

export function readStoredReviewUrl(articleId: string): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(`${KEY_PREFIX}${articleId}`)?.trim() || null;
  } catch {
    return null;
  }
}

export function writeStoredReviewUrl(articleId: string, url: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(`${KEY_PREFIX}${articleId}`, url);
  } catch {
    /* ignore quota */
  }
}
