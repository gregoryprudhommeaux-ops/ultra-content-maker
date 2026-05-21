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
          alignItems: "center",
          justifyContent: "center",
          background: NS_MARK_HERO,
        }}
      >
        <NsMarkImage size={320} borderRadius={48} />
      </div>
    ),
    { ...size },
  );
}
