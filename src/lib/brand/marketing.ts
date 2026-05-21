/** Query flag to show the public marketing landing while signed in. */
export const MARKETING_LANDING_PARAM = "marketing";
export const MARKETING_LANDING_VALUE = "1";
export const MARKETING_LANDING_QUERY = `${MARKETING_LANDING_PARAM}=${MARKETING_LANDING_VALUE}`;

export const MARKETING_LANDING_PATH = `/?${MARKETING_LANDING_QUERY}`;

/** Use with next-intl `Link` / `router.push` so the query param is preserved. */
export const MARKETING_LANDING_HREF = {
  pathname: "/" as const,
  query: { [MARKETING_LANDING_PARAM]: MARKETING_LANDING_VALUE },
};

export function isMarketingLandingMode(
  searchParams: Pick<URLSearchParams, "get"> | null | undefined,
): boolean {
  return searchParams?.get(MARKETING_LANDING_PARAM) === MARKETING_LANDING_VALUE;
}
