import type { ReactNode } from "react";

export const NS_MARK_GREEN = "#9dc41a";
export const NS_MARK_HERO = "#1a1a1a";

type NsMarkImageProps = {
  size: number;
  borderRadius: number;
};

/** NS mark for `next/og` ImageResponse (favicon & social previews). */
export function NsMarkImage({ size, borderRadius }: NsMarkImageProps): ReactNode {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius,
        background: NS_MARK_GREEN,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize: Math.round(size * 0.38),
        color: "#000000",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        letterSpacing: "-0.04em",
      }}
    >
      NS
    </div>
  );
}
