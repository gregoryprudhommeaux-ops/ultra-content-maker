import type { AudienceProfile, AuthorProfile } from "@/types/workspace";

export function buildNewsProfileContext(input: {
  author?: Partial<AuthorProfile> | null;
  audience?: Partial<AudienceProfile> | null;
  profileEnrichment?: Record<string, unknown>;
  personaExcerpt?: string;
}): string {
  const personaSnippet = input.personaExcerpt?.trim().slice(0, 1200) ?? "";
  return JSON.stringify(
    {
      roleTitle: input.author?.roleTitle ?? "",
      positioningLine: input.author?.positioningLine ?? "",
      websiteUrl: input.author?.websiteUrl ?? "",
      blogUrl: input.author?.blogUrl ?? "",
      targetLabel: input.audience?.targetLabel ?? "",
      contentFocus: input.audience?.contentFocus ?? "",
      audienceNotes: input.audience?.optionalNotes ?? "",
      profileEnrichment: input.profileEnrichment ?? {},
      personaSnippet,
    },
    null,
    2,
  );
}
