/** next-intl returns the full message path when a key is missing. */
export function isMissingSlopTranslation(result: string): boolean {
  return result.includes("setup.articles.slop");
}

type SlopTranslator = (key: string) => string;

/** Resolves a slop / human-writing flag id to a localized label. */
export function resolveSlopFlagLabel(t: SlopTranslator, flag: string): string {
  const violation = t(`humanWriting.violations.${flag}`);
  if (!isMissingSlopTranslation(violation)) return violation;

  const slop = t(`flags.${flag}`);
  if (!isMissingSlopTranslation(slop)) return slop;

  return flag.replace(/_/g, " ");
}
