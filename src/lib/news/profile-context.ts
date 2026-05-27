import {
  buildAuthorSteeringPayload,
  injectAuthorSteering,
  resolveAuthorSteering,
} from "@/lib/profile/author-steering-context";
import type { AuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import type {
  AudienceProfile,
  AuthorProfile,
  GapAnswerValue,
  ProfileEnrichment,
} from "@/types/workspace";

export function buildNewsProfileContext(input: {
  author?: Partial<AuthorProfile> | null;
  audience?: Partial<AudienceProfile> | null;
  profileEnrichment?: Record<string, unknown>;
  personaExcerpt?: string;
  newsInterestQuery?: string;
  authorSteering?: AuthorSteeringPayload | null;
}): string {
  const personaSnippet = input.personaExcerpt?.trim().slice(0, 1200) ?? "";
  const steering =
    resolveAuthorSteering({
      authorSteering: input.authorSteering,
      author: input.author,
      audience: input.audience,
      profileEnrichment: input.profileEnrichment,
      newsInterestQuery: input.newsInterestQuery,
    }) ??
    buildAuthorSteeringPayload({
      author: input.author as AuthorProfile | null,
      audience: input.audience as AudienceProfile | null,
      enrichment: input.profileEnrichment
        ? ({
            details: input.profileEnrichment as Record<string, GapAnswerValue>,
            updatedAt: new Date(),
          } satisfies ProfileEnrichment)
        : null,
      newsInterestQuery: input.newsInterestQuery,
    });

  return JSON.stringify(
    injectAuthorSteering(
      {
        personaSnippet,
      },
      steering,
    ),
    null,
    2,
  );
}
