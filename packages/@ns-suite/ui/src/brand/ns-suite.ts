/** Public URL of the NS Suite hub (all entrepreneur tools). */
export const NS_SUITE_URL =
  (typeof process.env.NEXT_PUBLIC_NS_SUITE_URL === "string" &&
  process.env.NEXT_PUBLIC_NS_SUITE_URL.trim().length > 0
    ? process.env.NEXT_PUBLIC_NS_SUITE_URL.trim()
    : null) ?? "https://nextstep-suite.vercel.app/";

export const NEXTSTEP_COMPANY = "NextStep Services";
export const NS_SUITE_NAME = "NS Suite";
