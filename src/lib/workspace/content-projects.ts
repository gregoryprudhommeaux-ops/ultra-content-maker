import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import {
  MAX_CONTENT_PROJECT_CHAT_MESSAGES,
  buildNewContentProject,
} from "@/lib/projects/content-project";
import { toDate } from "@/lib/workspace/firestore-utils";
import {
  workspaceCollectionRef,
  workspaceDocRef,
} from "@/lib/workspace/workspace-scope";
import type {
  ChannelOwner,
  ContentJob,
  ContentLanguage,
  ContentProject,
  ContentProjectChatMessage,
  ContentProjectIdeaHit,
  CtaIntensity,
  EmojiLevel,
  ProductFrame,
} from "@/types/workspace";

function projectsCollection(userId: string) {
  return workspaceCollectionRef(userId, "contentProjects");
}

function projectDoc(userId: string, projectId: string) {
  return workspaceDocRef(userId, "contentProjects", projectId);
}

function parseChat(raw: unknown): ContentProjectChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
    .map((m) => ({
      id: String(m.id ?? ""),
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: String(m.content ?? ""),
      createdAt: String(m.createdAt ?? new Date().toISOString()),
    }))
    .filter((m) => m.id && m.content);
}

function parseIdeas(raw: unknown): ContentProjectIdeaHit[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
    .map((m) => {
      const sourceRaw = m.source;
      const source: ContentProjectIdeaHit["source"] =
        sourceRaw === "news" ||
        sourceRaw === "manual" ||
        sourceRaw === "lucy" ||
        sourceRaw === "inspiration"
          ? sourceRaw
          : undefined;
      return {
        id: String(m.id ?? ""),
        title: String(m.title ?? ""),
        stars: typeof m.stars === "number" ? m.stars : 3,
        reason: String(m.reason ?? ""),
        source,
        url: typeof m.url === "string" ? m.url : undefined,
        sourceName: typeof m.sourceName === "string" ? m.sourceName : undefined,
        summary: typeof m.summary === "string" ? m.summary : undefined,
        publishedAt: typeof m.publishedAt === "string" ? m.publishedAt : undefined,
      };
    })
    .filter((m) => m.id && m.title);
}

function fromFirestore(id: string, d: DocumentData): ContentProject {
  return {
    id,
    name: (d.name as string) ?? "Nouveau projet",
    emoji: typeof d.emoji === "string" ? d.emoji : undefined,
    brief: (d.brief as string) ?? "",
    channelOwner: d.channelOwner as ChannelOwner | undefined,
    productFrame: d.productFrame as ProductFrame | undefined,
    contentLanguage: d.contentLanguage as ContentLanguage | undefined,
    contentJob: d.contentJob as ContentJob | undefined,
    emojiLevel: d.emojiLevel as EmojiLevel | undefined,
    preferredCtaStyle: d.preferredCtaStyle as CtaIntensity | undefined,
    includeSignaturePs: d.includeSignaturePs === true,
    newsInterestQuery:
      typeof d.newsInterestQuery === "string" ? d.newsInterestQuery : undefined,
    chat: parseChat(d.chat).slice(-MAX_CONTENT_PROJECT_CHAT_MESSAGES),
    ideas: parseIdeas(d.ideas),
    articleIds: Array.isArray(d.articleIds)
      ? (d.articleIds as string[]).filter((x) => typeof x === "string")
      : [],
    colorIndex: typeof d.colorIndex === "number" ? d.colorIndex : undefined,
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  };
}

export async function listContentProjects(userId: string): Promise<ContentProject[]> {
  const snap = await getDocs(
    query(projectsCollection(userId), orderBy("updatedAt", "desc")),
  );
  return snap.docs.map((docSnap) => fromFirestore(docSnap.id, docSnap.data()));
}

export async function getContentProject(
  userId: string,
  projectId: string,
): Promise<ContentProject | null> {
  const snap = await getDoc(projectDoc(userId, projectId));
  if (!snap.exists()) return null;
  return fromFirestore(snap.id, snap.data());
}

export type ContentProjectPatch = Partial<
  Pick<
    ContentProject,
    | "name"
    | "emoji"
    | "brief"
    | "channelOwner"
    | "productFrame"
    | "contentLanguage"
    | "contentJob"
    | "emojiLevel"
    | "preferredCtaStyle"
    | "includeSignaturePs"
    | "newsInterestQuery"
    | "chat"
    | "ideas"
    | "articleIds"
    | "colorIndex"
  >
>;

export async function createContentProject(
  userId: string,
  opts?: {
    name?: string;
    brief?: string;
    emoji?: string;
    channelOwner?: ChannelOwner;
    productFrame?: ProductFrame;
    contentLanguage?: ContentLanguage;
    contentJob?: ContentJob;
  },
): Promise<ContentProject> {
  const draft = buildNewContentProject("pending", opts);
  const ref = await addDoc(projectsCollection(userId), {
    name: draft.name,
    emoji: draft.emoji ?? null,
    brief: draft.brief,
    channelOwner: draft.channelOwner ?? null,
    productFrame: draft.productFrame ?? null,
    contentLanguage: draft.contentLanguage ?? null,
    contentJob: draft.contentJob ?? null,
    emojiLevel: null,
    preferredCtaStyle: null,
    includeSignaturePs: false,
    newsInterestQuery: null,
    chat: [],
    ideas: [],
    articleIds: [],
    colorIndex: draft.colorIndex ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const created = await getContentProject(userId, ref.id);
  if (!created) {
    return { ...draft, id: ref.id };
  }
  return created;
}

export async function updateContentProject(
  userId: string,
  projectId: string,
  patch: ContentProjectPatch,
): Promise<void> {
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (patch.name !== undefined) payload.name = patch.name.trim() || "Nouveau projet";
  if (patch.emoji !== undefined) payload.emoji = patch.emoji?.trim() || null;
  if (patch.brief !== undefined) payload.brief = patch.brief;
  if (patch.channelOwner !== undefined) payload.channelOwner = patch.channelOwner ?? null;
  if (patch.productFrame !== undefined) payload.productFrame = patch.productFrame ?? null;
  if (patch.contentLanguage !== undefined) {
    payload.contentLanguage = patch.contentLanguage ?? null;
  }
  if (patch.contentJob !== undefined) payload.contentJob = patch.contentJob ?? null;
  if (patch.emojiLevel !== undefined) payload.emojiLevel = patch.emojiLevel ?? null;
  if (patch.preferredCtaStyle !== undefined) {
    payload.preferredCtaStyle = patch.preferredCtaStyle ?? null;
  }
  if (patch.includeSignaturePs !== undefined) {
    payload.includeSignaturePs = Boolean(patch.includeSignaturePs);
  }
  if (patch.newsInterestQuery !== undefined) {
    payload.newsInterestQuery = patch.newsInterestQuery?.trim() || null;
  }
  if (patch.chat !== undefined) {
    payload.chat = patch.chat.slice(-MAX_CONTENT_PROJECT_CHAT_MESSAGES);
  }
  if (patch.ideas !== undefined) payload.ideas = patch.ideas;
  if (patch.articleIds !== undefined) payload.articleIds = patch.articleIds;
  if (patch.colorIndex !== undefined) payload.colorIndex = patch.colorIndex ?? null;

  await updateDoc(projectDoc(userId, projectId), payload);
}

export async function deleteContentProject(
  userId: string,
  projectId: string,
): Promise<void> {
  await deleteDoc(projectDoc(userId, projectId));
}
