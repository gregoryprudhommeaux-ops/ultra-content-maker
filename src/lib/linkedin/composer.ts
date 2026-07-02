/** Opens LinkedIn feed composer; `text` may be ignored if the URL is too long. */
const LINKEDIN_FEED_BASE = "https://www.linkedin.com/feed/";

/** Conservative limit so the share URL stays within browser / LinkedIn handling. */
const MAX_ENCODED_TEXT_LENGTH = 1_500;

export function buildLinkedInComposerUrl(text: string): string {
 const encoded = encodeURIComponent(text.trim());
 if (!encoded || encoded.length > MAX_ENCODED_TEXT_LENGTH) {
 return `${LINKEDIN_FEED_BASE}?shareActive=true`;
 }
 return `${LINKEDIN_FEED_BASE}?shareActive=true&text=${encoded}`;
}

/**
 * Copies post text and opens LinkedIn's compose dialog in a new tab.
 * There is no official "template" API · clipboard + composer URL is the best UX without OAuth.
 */
export async function copyAndOpenLinkedInComposer(text: string): Promise<boolean> {
 const trimmed = text.trim();
 if (!trimmed) return false;

 try {
 await navigator.clipboard.writeText(trimmed);
 } catch {
 return false;
 }

 const url = buildLinkedInComposerUrl(trimmed);
 window.open(url, "_blank", "noopener,noreferrer");
 return true;
}
