import { linkedInActivityUrlsFromProfile } from "@/lib/profile/author-reference-urls";
import { isValidUrl } from "@/lib/workspace/firestore-utils";
import type {
  AuthorProfile,
  ContentLanguage,
  SourceLink,
} from "@/types/workspace";

const LINKEDIN_IN_PROFILE = /linkedin\.com\/in\/[^/?#]+/i;

/** Canonical `/in/{vanity}/` URL from any LinkedIn profile or activity link. */
export function extractLinkedInProfileUrlFromString(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed || !isValidUrl(trimmed) || !LINKEDIN_IN_PROFILE.test(trimmed)) {
    return null;
  }
  try {
    const normalized = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const parsed = new URL(normalized);
    const match = parsed.pathname.match(/\/in\/([^/]+)/i);
    if (!match?.[1]) return null;
    return `https://www.linkedin.com/in/${match[1]}/`;
  } catch {
    return null;
  }
}

/** First known LinkedIn profile URL from author doc, activity feeds, or inspiration sources. */
export function resolveLinkedInProfileUrl(input: {
  author?:
    | AuthorProfile
    | Pick<AuthorProfile, "linkedinProfileUrl" | "linkedinActivitySources" | "linkedinActivityUrl">
    | null;
  sources?: SourceLink[];
}): string | undefined {
  const fromAuthor = input.author?.linkedinProfileUrl?.trim();
  if (fromAuthor) {
    const canonical =
      extractLinkedInProfileUrlFromString(fromAuthor) ??
      (isValidUrl(fromAuthor) ? fromAuthor : undefined);
    if (canonical) return canonical;
  }

  for (const url of linkedInActivityUrlsFromProfile(input.author)) {
    const canonical = extractLinkedInProfileUrlFromString(url);
    if (canonical) return canonical;
  }

  for (const source of input.sources ?? []) {
    if (
      source.type === "linkedin_profile" ||
      source.category === "inspiration_profile"
    ) {
      const canonical = extractLinkedInProfileUrlFromString(source.url);
      if (canonical) return canonical;
    }
  }

  return undefined;
}

export type MergeAuthorProfileOptions = {
  sources?: SourceLink[];
  contentLanguageFallback?: ContentLanguage;
};

/**
 * Single view of the author profile: canonical author doc + data collected
 * elsewhere (sources, workspace language) without asking the user again.
 */
export function mergeAuthorProfile(
  author: AuthorProfile | null | undefined,
  options?: MergeAuthorProfileOptions,
): AuthorProfile | null {
  const linkedinProfileUrl = resolveLinkedInProfileUrl({
    author,
    sources: options?.sources,
  });

  const contentLanguage =
    author?.contentLanguage ?? options?.contentLanguageFallback;

  if (!author && !linkedinProfileUrl && !contentLanguage) {
    return null;
  }

  return {
    ...(author ?? {
      status: "not_started",
      updatedAt: new Date(),
    }),
    linkedinProfileUrl: linkedinProfileUrl ?? author?.linkedinProfileUrl,
    contentLanguage: contentLanguage ?? author?.contentLanguage ?? "en",
    status: author?.status ?? "not_started",
    updatedAt: author?.updatedAt ?? new Date(),
  };
}

async function workspaceContentLanguageFallback(
  userId: string,
): Promise<ContentLanguage | undefined> {
  const { getActiveWorkspaceScope, requireWorkspaceScope } = await import(
    "@/lib/workspace/workspace-scope"
  );
  const scope = getActiveWorkspaceScope() ?? requireWorkspaceScope(userId);
  const { getWorkspaceAccount } = await import("@/lib/workspace/accounts");
  const account = await getWorkspaceAccount(scope.ownerId, scope.accountId).catch(
    () => null,
  );
  return account?.contentLanguage;
}

/** Load author profile merged with all collected workspace signals. */
export async function getResolvedAuthorProfile(
  userId: string,
): Promise<AuthorProfile | null> {
  const { getAuthorProfile } = await import("@/lib/workspace/author");
  const { listSources } = await import("@/lib/workspace/sources");

  const [author, sources, contentLanguageFallback] = await Promise.all([
    getAuthorProfile(userId),
    listSources(userId).catch(() => [] as SourceLink[]),
    workspaceContentLanguageFallback(userId),
  ]);

  return mergeAuthorProfile(author, { sources, contentLanguageFallback });
}

/**
 * Backfill canonical author fields when data already exists in sources or
 * workspace metadata (keeps onboarding gates and forms in sync).
 */
export async function syncAuthorProfileFromCollectedData(
  userId: string,
): Promise<AuthorProfile | null> {
  const merged = await getResolvedAuthorProfile(userId);
  if (!merged) return null;

  const { getAuthorProfile, saveAuthorProfile } = await import("@/lib/workspace/author");
  const prev = await getAuthorProfile(userId);

  const patch: Parameters<typeof saveAuthorProfile>[1] = {};
  if (merged.linkedinProfileUrl?.trim() && !prev?.linkedinProfileUrl?.trim()) {
    patch.linkedinProfileUrl = merged.linkedinProfileUrl;
  }
  if (merged.contentLanguage && !prev?.contentLanguage) {
    patch.contentLanguage = merged.contentLanguage;
  }

  if (Object.keys(patch).length === 0) return merged;

  await saveAuthorProfile(userId, patch);
  return getResolvedAuthorProfile(userId);
}
