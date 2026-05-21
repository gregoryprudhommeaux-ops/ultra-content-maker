import { NsMarkImage, NS_MARK_HERO } from "@/lib/brand/ns-mark-image";
import { ImageResponse } from "next/og";

export const alt = "Ultra Content Maker — NS Suite";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <NsMarkImage size={140} borderRadius={24} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 44,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            ULTRA CONTENT MAKER
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 34,
              fontWeight: 700,
              color: "#e6e6e6",
            }}
          >
            AI Ghostwriter for LinkedIn
          </p>
        </div>
      </div>
    ),
    { ...size },
  );
}
