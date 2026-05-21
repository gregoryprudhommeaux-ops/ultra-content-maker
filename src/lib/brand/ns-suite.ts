/** Public URL of the NS Suite hub (all entrepreneur tools). Set when the hub page is live. */
export const NS_SUITE_URL =
  typeof process.env.NEXT_PUBLIC_NS_SUITE_URL === "string" &&
  process.env.NEXT_PUBLIC_NS_SUITE_URL.length > 0
    ? process.env.NEXT_PUBLIC_NS_SUITE_URL
    : null;

export const NEXTSTEP_COMPANY = "NextStep Services";
export const NS_SUITE_NAME = "NS Suite";
export const PRODUCT_NAME = "ULTRA CONTENT MAKER";
