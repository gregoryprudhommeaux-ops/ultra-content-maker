/** Canonical public URL for metadata, Open Graph, and share previews. */
export const CANONICAL_SITE_URL = "https://ultra-content-maker.vercel.app";

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? CANONICAL_SITE_URL;
}
