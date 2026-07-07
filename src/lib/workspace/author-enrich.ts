import type { AuthorProfile } from "@/types/workspace";
import { linkedInActivityUrlsFromProfile, migrateWebSources } from "@/lib/profile/author-reference-urls";
import type { AuthorProfileTab } from "@/components/setup/author-profile-tabs";
import { isValidUrl } from "./firestore-utils";
import { isAuthorProfileExpressComplete } from "./author";

export function hasCapturedLinkedIn(
  profile: Pick<AuthorProfile, "linkedinProfileUrl"> | null | undefined,
): boolean {
  const linkedin = profile?.linkedinProfileUrl?.trim() ?? "";
  return linkedin.length > 0 && isValidUrl(linkedin);
}

export function isAuthorEnrichContext(
  profile: AuthorProfile | null | undefined,
  fromParam: string | null,
): boolean {
  if (fromParam === "express") return true;
  return isAuthorProfileExpressComplete(profile);
}

/** First tab where the user still has optional fields to add (express basics already saved). */
export function resolveAuthorEnrichTab(
  profile: AuthorProfile | null | undefined,
): AuthorProfileTab {
  const hasEssentialExtras = Boolean(
    linkedInActivityUrlsFromProfile(profile).length > 0 ||
      migrateWebSources(profile).length > 0,
  );
  const voiceComplete = Boolean(
    profile?.roleTitle?.trim() &&
      profile?.positioningLine?.trim() &&
      profile?.contentLanguage,
  );

  if (!hasEssentialExtras) return "essential";
  if (!voiceComplete) return "voice";
  return "inspirations";
}

export function hasExpressVoiceBasics(
  profile: Pick<AuthorProfile, "roleTitle" | "positioningLine" | "contentLanguage"> | null | undefined,
): boolean {
  return Boolean(
    profile?.roleTitle?.trim() &&
      profile?.positioningLine?.trim() &&
      profile?.contentLanguage,
  );
}
