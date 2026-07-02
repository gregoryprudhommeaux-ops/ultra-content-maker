import type { AuthorProfile } from "@/types/workspace";
import type { AuthorProfileTab } from "@/components/setup/author-profile-tabs";
import { isAuthorProfileExpressComplete } from "./author";

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
    profile?.linkedinActivityUrl?.trim() ||
      profile?.websiteUrl?.trim() ||
      profile?.blogUrl?.trim(),
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
