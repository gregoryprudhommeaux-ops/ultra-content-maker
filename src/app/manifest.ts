import type { MetadataRoute } from "next";

/** PWA / Add to Home Screen metadata for Ultra Content Maker. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ultra Content Maker",
    short_name: "UCM",
    description:
      "LinkedIn AI ghostwriter and authority system · Persona, brief, quality posts, export.",
    start_url: "/",
    display: "standalone",
    background_color: "#9dc41a",
    theme_color: "#9dc41a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
