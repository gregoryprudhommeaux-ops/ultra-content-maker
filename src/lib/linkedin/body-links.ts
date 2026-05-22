const URL_IN_BODY =
  /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

/** Detect external links in post body (LinkedIn reach penalty in main text). */
export function bodyContainsExternalLink(text: string): boolean {
  return URL_IN_BODY.test(text);
}

export function findExternalLinksInText(text: string): string[] {
  const matches = text.match(URL_IN_BODY);
  return matches ? [...new Set(matches)] : [];
}
