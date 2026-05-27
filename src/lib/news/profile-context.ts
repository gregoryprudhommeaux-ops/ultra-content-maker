import type { AudienceProfile, AuthorProfile } from "@/types/workspace";

export function buildNewsProfileContext(input: {
  author?: Partial<AuthorProfile> | null;
  audience?: Partial<AudienceProfile> | null;
  profileEnrichment?: Record<string, unknown>;
  personaExcerpt?: string;
  newsInterestQuery?: string;
}): string {
  const personaSnippet = input.personaExcerpt?.trim().slice(0, 1200) ?? "";
  const newsInterest =
    input.newsInterestQuery?.trim() ||
    input.audience?.newsInterestQuery?.trim() ||
    input.audience?.contentFocus?.trim() ||
    "";
  return JSON.stringify(
    {
      roleTitle: input.author?.roleTitle ?? "",
      positioningLine: input.author?.positioningLine ?? "",
      websiteUrl: input.author?.websiteUrl ?? "",
      blogUrl: input.author?.blogUrl ?? "",
      targetLabel: input.audience?.targetLabel ?? "",
      contentFocus: input.audience?.contentFocus ?? "",
      newsInterestQuery: newsInterest,
      audienceNotes: input.audience?.optionalNotes ?? "",
      profileEnrichment: input.profileEnrichment ?? {},
      personaSnippet,
    },
    null,
    2,
  );
}
