import { NsMarkImage } from "@/lib/brand/ns-mark-image";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<NsMarkImage size={180} borderRadius={28} />, {
    ...size,
  });
}
