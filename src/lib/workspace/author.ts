import { serverTimestamp, setDoc } from "firebase/firestore";
import type {
  AuthorProfile,
  AuthorReferenceUrl,
  ContentLanguage,
  CreationStrategyCache,
} from "@/types/workspace";
import {
  legacyAuthorUrlFieldsFromSources,
  migrateLinkedInActivitySources,
  migrateWebSources,
  normalizeAuthorReferenceUrl,
} from "@/lib/profile/author-reference-urls";
import { isValidUrl, toDate } from "./firestore-utils";
import { readScopedOrLegacyDoc, workspaceDocRef } from "./workspace-scope";

/** Minimum fields before the author step counts as complete (onboarding gate). */
export function isAuthorProfileMinimumComplete(
  profile: Pick<
    AuthorProfile,
    "linkedinProfileUrl" | "roleTitle" | "positioningLine" | "contentLanguage"
  > | null | undefined,
): boolean {
  if (!profile) return false;
  const linkedin = profile.linkedinProfileUrl?.trim() ?? "";
  return (
    linkedin.length > 0 &&
    isValidUrl(linkedin) &&
    Boolean(profile.roleTitle?.trim()) &&
    Boolean(profile.positioningLine?.trim()) &&
    Boolean(profile.contentLanguage)
  );
}

/** Express onboarding: LinkedIn + language — enough to draft a Persona and test. */
export function isAuthorProfileExpressComplete(
  profile: Pick<AuthorProfile, "linkedinProfileUrl" | "contentLanguage"> | null | undefined,
): boolean {
  if (!profile) return false;
  const linkedin = profile.linkedinProfileUrl?.trim() ?? "";
  return linkedin.length > 0 && isValidUrl(linkedin) && Boolean(profile.contentLanguage);
}

const DOC_ID = "profile";

function parseReferenceUrls(raw: unknown): AuthorReferenceUrl[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw
    .map(normalizeAuthorReferenceUrl)
    .filter((item): item is AuthorReferenceUrl => item !== null);
  return items.length > 0 ? items : undefined;
}

export async function getAuthorProfile(userId: string): Promise<AuthorProfile | null> {
  const d = await readScopedOrLegacyDoc(userId, (x) => x, "author", DOC_ID);
  if (!d) return null;

  const partial = {
    linkedinActivitySources: parseReferenceUrls(d.linkedinActivitySources),
    linkedinActivityUrl: d.linkedinActivityUrl as string | undefined,
    webSources: parseReferenceUrls(d.webSources),
    websiteUrl: d.websiteUrl as string | undefined,
    blogUrl: d.blogUrl as string | undefined,
  };

  const linkedinActivitySources = migrateLinkedInActivitySources(partial);
  const webSources = migrateWebSources(partial);
  const legacy = legacyAuthorUrlFieldsFromSources({
    linkedinActivitySources,
    webSources,
  });

  return {
    linkedinProfileUrl: d.linkedinProfileUrl as string | undefined,
    linkedinActivityUrl: legacy.linkedinActivityUrl,
    linkedinActivitySources,
    creationStrategyCache: d.creationStrategyCache as
      | CreationStrategyCache
      | undefined,
    creationStrategySteering: d.creationStrategySteering as string | undefined,
    websiteUrl: legacy.websiteUrl,
    blogUrl: legacy.blogUrl,
    webSources,
    contentLanguage: (d.contentLanguage as ContentLanguage) ?? "en",
    roleTitle: d.roleTitle as string | undefined,
    positioningLine: d.positioningLine as string | undefined,
    contentArchetype: d.contentArchetype as AuthorProfile["contentArchetype"] | undefined,
    linkedInDeliveryMode: d.linkedInDeliveryMode as AuthorProfile["linkedInDeliveryMode"] | undefined,
    linkedInPublishAccessNotes: d.linkedInPublishAccessNotes as string | undefined,
    status: (d.status as AuthorProfile["status"]) ?? "not_started",
    updatedAt: toDate(d.updatedAt),
  };
}

export type SaveAuthorInput = Partial<
  Omit<AuthorProfile, "updatedAt" | "status">
> & {
  status?: AuthorProfile["status"];
};

export async function saveAuthorProfile(userId: string, input: SaveAuthorInput) {
  const prev = await getAuthorProfile(userId);
  const status =
    input.status ??
    (prev?.status === "complete" ? "complete" : "in_progress");

  const linkedinActivitySources =
    input.linkedinActivitySources ?? prev?.linkedinActivitySources ?? [];
  const webSources = input.webSources ?? prev?.webSources ?? [];
  const legacy = legacyAuthorUrlFieldsFromSources({
    linkedinActivitySources,
    webSources,
  });

  await setDoc(
    workspaceDocRef(userId, "author", DOC_ID),
    {
      linkedinProfileUrl: input.linkedinProfileUrl ?? prev?.linkedinProfileUrl ?? null,
      linkedinActivitySources:
        linkedinActivitySources.length > 0 ? linkedinActivitySources : null,
      linkedinActivityUrl: legacy.linkedinActivityUrl ?? null,
      creationStrategyCache:
        input.creationStrategyCache ?? prev?.creationStrategyCache ?? null,
      creationStrategySteering:
        input.creationStrategySteering ?? prev?.creationStrategySteering ?? null,
      webSources: webSources.length > 0 ? webSources : null,
      websiteUrl: legacy.websiteUrl ?? null,
      blogUrl: legacy.blogUrl ?? null,
      contentLanguage: input.contentLanguage ?? prev?.contentLanguage ?? "en",
      roleTitle: input.roleTitle ?? prev?.roleTitle ?? null,
      positioningLine: input.positioningLine ?? prev?.positioningLine ?? null,
      contentArchetype: input.contentArchetype ?? prev?.contentArchetype ?? null,
      linkedInDeliveryMode: input.linkedInDeliveryMode ?? prev?.linkedInDeliveryMode ?? null,
      linkedInPublishAccessNotes:
        input.linkedInPublishAccessNotes ?? prev?.linkedInPublishAccessNotes ?? null,
      status,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  const lang =
    input.contentLanguage ?? prev?.contentLanguage ?? "fr";
  const { syncPersonaAfterProfileChange } = await import(
    "@/lib/persona/sync-after-profile-save"
  );
  await syncPersonaAfterProfileChange(userId, lang);
}

export async function completeAuthorStep(userId: string) {
  const prev = await getAuthorProfile(userId);
  if (!isAuthorProfileMinimumComplete(prev)) {
    throw new Error("author_profile_minimum_incomplete");
  }
  await saveAuthorProfile(userId, { status: "complete" });
}
