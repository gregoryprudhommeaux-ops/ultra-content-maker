import type { Firestore } from "firebase-admin/firestore";
import { buildAuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import type { AuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import { serializeBioDocumentsForPrompt, listBioDocumentsServer } from "@/lib/workspace/bio-documents.server";
import type { ResolvedWorkspaceScope } from "@/lib/workspace/resolve-workspace-scope.server";
import {
  listWorkspaceCollectionDocs,
  readWorkspaceSingletonDoc,
} from "@/lib/workspace/workspace-read.server";
import type {
  AudienceProfile,
  AuthorProfile,
  GapAnswerValue,
  ProfileEnrichment,
  SourceLink,
} from "@/types/workspace";

function mapSource(id: string, data: Record<string, unknown>, index: number): SourceLink {
  return {
    id,
    type: data.type as SourceLink["type"],
    url: String(data.url ?? ""),
    label: data.label ? String(data.label) : undefined,
    category:
      data.category === "my_post" ||
      data.category === "inspiration_post" ||
      data.category === "inspiration_profile"
        ? data.category
        : data.type === "linkedin_profile"
          ? "inspiration_profile"
          : "my_post",
    likedAspects: Array.isArray(data.likedAspects)
      ? (data.likedAspects as SourceLink["likedAspects"])
      : undefined,
    whyLike: data.whyLike ? String(data.whyLike) : undefined,
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : index,
    createdAt: new Date(),
  };
}

/** Load author steering from the represented workspace (server-side source of truth). */
export async function gatherAuthorSteeringPayloadServer(
  db: Firestore,
  scope: ResolvedWorkspaceScope,
  options?: { newsInterestQuery?: string },
): Promise<AuthorSteeringPayload> {
  const [authorRaw, audienceRaw, enrichmentRaw, sourceDocs, bioDocs] = await Promise.all([
    readWorkspaceSingletonDoc(db, scope, "author", "profile"),
    readWorkspaceSingletonDoc(db, scope, "audience", "profile"),
    readWorkspaceSingletonDoc(db, scope, "enrichment", "profile"),
    listWorkspaceCollectionDocs(db, scope, "sources"),
    listBioDocumentsServer(db, scope.ownerId, scope.accountId).catch(() => []),
  ]);

  const author = (authorRaw ?? null) as AuthorProfile | null;
  const audience = (audienceRaw ?? null) as AudienceProfile | null;
  const enrichment: ProfileEnrichment | null = enrichmentRaw
    ? {
        details: (enrichmentRaw.details as Record<string, GapAnswerValue>) ?? {},
        updatedAt: new Date(),
      }
    : null;
  const sources = sourceDocs.map((d, i) => mapSource(d.id, d.data, i));

  return buildAuthorSteeringPayload({
    author,
    audience,
    enrichment,
    sources,
    newsInterestQuery: options?.newsInterestQuery,
    bioReferenceDocuments: serializeBioDocumentsForPrompt(bioDocs),
  });
}

export async function readWorkspacePersonaExcerptServer(
  db: Firestore,
  scope: ResolvedWorkspaceScope,
): Promise<string> {
  const persona = await readWorkspaceSingletonDoc(db, scope, "persona", "current");
  return typeof persona?.promptText === "string" ? persona.promptText.trim() : "";
}
