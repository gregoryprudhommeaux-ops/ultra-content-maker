/**
 * Build a LinkedIn people-search URL that always resolves (unlike AI-guessed /in/ slugs).
 * Users can open the real profile from results and send a connection invite.
 */
export function buildLinkedInPeopleSearchUrl(
  name: string,
  headline?: string | null,
): string {
  const trimmedName = name.trim().replace(/\s+/g, " ");
  if (!trimmedName) {
    return "https://www.linkedin.com/search/results/people/";
  }

  const keywords = [trimmedName];
  const headlineTrim = headline?.trim().replace(/\s+/g, " ") ?? "";
  if (headlineTrim) {
    // First segment of the headline often matches the LinkedIn title filter.
    const firstClause = headlineTrim.split(/[|·•]/)[0]?.trim() ?? "";
    if (firstClause && firstClause.length >= 3 && firstClause.length <= 80) {
      keywords.push(firstClause);
    }
  }

  const q = encodeURIComponent(keywords.join(" "));
  return `https://www.linkedin.com/search/results/people/?keywords=${q}`;
}
