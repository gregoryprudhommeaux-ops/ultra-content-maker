import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type {
  AuthorProfile,
  ContentLanguage,
  CreationStrategyCache,
} from "@/types/workspace";
import { getClientFirestore } from "@/lib/firebase/client";
import { toDate } from "./firestore-utils";

const DOC_ID = "profile";

function authorRef(userId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return doc(db, "users", userId, "author", DOC_ID);
}

export async function getAuthorProfile(userId: string): Promise<AuthorProfile | null> {
  const snap = await getDoc(authorRef(userId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    linkedinProfileUrl: d.linkedinProfileUrl as string | undefined,
    linkedinActivityUrl: d.linkedinActivityUrl as string | undefined,
    creationStrategyCache: d.creationStrategyCache as
      | CreationStrategyCache
      | undefined,
    websiteUrl: d.websiteUrl as string | undefined,
    blogUrl: d.blogUrl as string | undefined,
    contentLanguage: (d.contentLanguage as ContentLanguage) ?? "en",
    roleTitle: d.roleTitle as string | undefined,
    positioningLine: d.positioningLine as string | undefined,
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
    authorRef(userId),
    {
      linkedinProfileUrl: input.linkedinProfileUrl ?? prev?.linkedinProfileUrl ?? null,
      linkedinActivityUrl:
        input.linkedinActivityUrl ?? prev?.linkedinActivityUrl ?? null,
      creationStrategyCache:
        input.creationStrategyCache ?? prev?.creationStrategyCache ?? null,
      websiteUrl: input.websiteUrl ?? prev?.websiteUrl ?? null,
      blogUrl: input.blogUrl ?? prev?.blogUrl ?? null,
      contentLanguage: input.contentLanguage ?? prev?.contentLanguage ?? "en",
      roleTitle: input.roleTitle ?? prev?.roleTitle ?? null,
      positioningLine: input.positioningLine ?? prev?.positioningLine ?? null,
      status,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  const { syncPersonaAfterProfileSave } = await import(
    "@/lib/persona/sync-after-profile-save"
  );
  await syncPersonaAfterProfileSave(userId);
}

export async function completeAuthorStep(userId: string) {
  await saveAuthorProfile(userId, { status: "complete" });
}
