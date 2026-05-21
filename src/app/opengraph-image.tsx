import { NsMarkImage, NS_MARK_HERO } from "@/lib/brand/ns-mark-image";
import { ImageResponse } from "next/og";

export const alt = "Ultra Content Maker — NS Suite";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const OG_TAGLINE = "Ultra Content Maker: AI ghostwriter for LinkedIn";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: NS_MARK_HERO,
          gap: 32,
        }}
      >
        <NsMarkImage size={140} borderRadius={24} />
        <p
          style={{
            margin: 0,
            maxWidth: 900,
            textAlign: "center",
            fontSize: 40,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.25,
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {OG_TAGLINE}
        </p>
      </div>
    ),
    { ...size },
  );
}
