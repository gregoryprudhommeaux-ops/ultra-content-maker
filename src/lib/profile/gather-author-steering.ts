import { buildAuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import type { AuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import { getAuthorProfile } from "@/lib/workspace/author";
import { getAudienceProfile } from "@/lib/workspace/audience";
import { getProfileEnrichment } from "@/lib/workspace/enrichment";
import { listBioDocuments } from "@/lib/workspace/bio-documents";
import { serializeBioDocumentsForPrompt } from "@/lib/workspace/bio-documents-utils";
import { listSources } from "@/lib/workspace/sources";
import {
  getActiveWorkspaceScope,
  requireWorkspaceScope,
  type WorkspaceScope,
} from "@/lib/workspace/workspace-scope";

function resolveScope(userId: string, scope?: WorkspaceScope | null): WorkspaceScope {
  return scope ?? getActiveWorkspaceScope() ?? requireWorkspaceScope(userId);
}

/** Load full author steering context from Firestore (client-side). */
export async function gatherAuthorSteeringPayload(
  userId: string,
  options?: { newsInterestQuery?: string; scope?: WorkspaceScope | null },
): Promise<AuthorSteeringPayload> {
  const scope = resolveScope(userId, options?.scope);
  const ownerId = scope.ownerId;

  const [author, audience, enrichment, sources, bioDocs] = await Promise.all([
    getAuthorProfile(ownerId),
    getAudienceProfile(ownerId),
    getProfileEnrichment(ownerId),
    listSources(ownerId),
    listBioDocuments(ownerId).catch(() => []),
  ]);

  return buildAuthorSteeringPayload({
    author,
    audience,
    enrichment,
    sources,
    newsInterestQuery: options?.newsInterestQuery,
    bioReferenceDocuments: serializeBioDocumentsForPrompt(bioDocs),
  });
}
