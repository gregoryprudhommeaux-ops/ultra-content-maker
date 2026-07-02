import { normalizeLinkedInProfileUrl } from "./urls";

export function stableCreatorId(linkedinUrl: string): string {
  const normalized = normalizeLinkedInProfileUrl(linkedinUrl);
  let h = 0;
  for (let i = 0; i < normalized.length; i++) {
    h = (Math.imul(31, h) + normalized.charCodeAt(i)) | 0;
  }
  return `creator-${(h >>> 0).toString(36)}`;
}
