import { buildAuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import type { AuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import { getAuthorProfile } from "@/lib/workspace/author";
import { getAudienceProfile } from "@/lib/workspace/audience";
import { getProfileEnrichment } from "@/lib/workspace/enrichment";
import { listSources } from "@/lib/workspace/sources";

/** Load full author steering context from Firestore (client-side). */
export async function gatherAuthorSteeringPayload(
  userId: string,
  options?: { newsInterestQuery?: string },
): Promise<AuthorSteeringPayload> {
  const [author, audience, enrichment, sources] = await Promise.all([
    getAuthorProfile(userId),
    getAudienceProfile(userId),
    getProfileEnrichment(userId),
    listSources(userId),
  ]);

  return buildAuthorSteeringPayload({
    author,
    audience,
    enrichment,
    sources,
    newsInterestQuery: options?.newsInterestQuery,
  });
}
