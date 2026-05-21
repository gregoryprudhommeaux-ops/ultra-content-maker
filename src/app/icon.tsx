import { NsMarkImage } from "@/lib/brand/ns-mark-image";
import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<NsMarkImage size={32} borderRadius={6} />, {
    ...size,
  });
}
