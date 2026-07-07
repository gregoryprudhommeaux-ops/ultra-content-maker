import { serverTimestamp, setDoc } from "firebase/firestore";
import type {
  AuthorProfile,
  ContentLanguage,
  CreationStrategyCache,
} from "@/types/workspace";
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

export async function getAuthorProfile(userId: string): Promise<AuthorProfile | null> {
  const d = await readScopedOrLegacyDoc(userId, (x) => x, "author", DOC_ID);
  if (!d) return null;
  return {
    linkedinProfileUrl: d.linkedinProfileUrl as string | undefined,
    linkedinActivityUrl: d.linkedinActivityUrl as string | undefined,
    creationStrategyCache: d.creationStrategyCache as
      | CreationStrategyCache
      | undefined,
    creationStrategySteering: d.creationStrategySteering as string | undefined,
    websiteUrl: d.websiteUrl as string | undefined,
    blogUrl: d.blogUrl as string | undefined,
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
  await setDoc(
    workspaceDocRef(userId, "author", DOC_ID),
    {
      linkedinProfileUrl: input.linkedinProfileUrl ?? prev?.linkedinProfileUrl ?? null,
      linkedinActivityUrl:
        input.linkedinActivityUrl ?? prev?.linkedinActivityUrl ?? null,
      creationStrategyCache:
        input.creationStrategyCache ?? prev?.creationStrategyCache ?? null,
      creationStrategySteering:
        input.creationStrategySteering ?? prev?.creationStrategySteering ?? null,
      websiteUrl: input.websiteUrl ?? prev?.websiteUrl ?? null,
      blogUrl: input.blogUrl ?? prev?.blogUrl ?? null,
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
