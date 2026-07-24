import { serverTimestamp, setDoc } from "firebase/firestore";
import type { AudienceProfile } from "@/types/workspace";
import { toDate } from "./firestore-utils";
import { readScopedOrLegacyDoc, workspaceDocRef } from "./workspace-scope";

const DOC_ID = "profile";

const AUDIENCE_STRING_KEYS = [
  "targetLabel",
  "contentFocus",
  "contentNiche",
  "newsInterestQuery",
  "optionalNotes",
] as const;

type AudienceWritable = Partial<Omit<AudienceProfile, "updatedAt">> & {
  skipped?: boolean;
};

function audiencePatchPayload(input: AudienceWritable): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  for (const key of AUDIENCE_STRING_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
    const value = input[key];
    payload[key] =
      typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  }

  if (Object.prototype.hasOwnProperty.call(input, "skipped")) {
    payload.skipped = Boolean(input.skipped);
  }

  return payload;
}

export async function getAudienceProfile(userId: string): Promise<AudienceProfile | null> {
  const d = await readScopedOrLegacyDoc(userId, (x) => x, "audience", DOC_ID);
  if (!d) return null;
  return {
    targetLabel: d.targetLabel as string | undefined,
    contentFocus: d.contentFocus as string | undefined,
    contentNiche: d.contentNiche as string | undefined,
    newsInterestQuery: d.newsInterestQuery as string | undefined,
    optionalNotes: d.optionalNotes as string | undefined,
    skipped: d.skipped as boolean | undefined,
    updatedAt: toDate(d.updatedAt),
  };
}

/**
 * Partial merge: only writes keys present on `input`.
 * Callers that only update niche / news interest must not wipe targetLabel,
 * contentFocus, or a prior `skipped: true` (that ejects users from creation).
 */
export async function saveAudienceProfile(userId: string, input: AudienceWritable) {
  await setDoc(
    workspaceDocRef(userId, "audience", DOC_ID),
    audiencePatchPayload(input),
    { merge: true },
  );
  const { getAuthorProfile } = await import("@/lib/workspace/author");
  const author = await getAuthorProfile(userId);
  const { syncPersonaAfterProfileChange } = await import(
    "@/lib/persona/sync-after-profile-save"
  );
  await syncPersonaAfterProfileChange(userId, author?.contentLanguage);
}

export async function skipAudienceStep(userId: string) {
  await saveAudienceProfile(userId, { skipped: true });
}

/** Exported for unit tests. */
export { audiencePatchPayload };
