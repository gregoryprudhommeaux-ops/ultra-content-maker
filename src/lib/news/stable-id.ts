/** Stable Firestore id for a news item (dedupe by URL). */
export function stableNewsId(url: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i++) {
    h = (Math.imul(31, h) + url.charCodeAt(i)) | 0;
  }
  return `news-${(h >>> 0).toString(36)}`;
}
