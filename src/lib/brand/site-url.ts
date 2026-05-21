/** Canonical public URL for metadata, Open Graph, and share previews. */
export const CANONICAL_SITE_URL = "https://ultra-content-maker.vercel.app";

/** Bump when og-image.png design changes (cache-bust for WhatsApp / Facebook). */
export const OG_IMAGE_VERSION = "3";

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? CANONICAL_SITE_URL;
}

export function getOgImageUrl(): string {
  return `${getSiteUrl()}/og-image.png?v=${OG_IMAGE_VERSION}`;
}
