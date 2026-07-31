import type {
  ChannelOwner,
  ContentJob,
  ContentLanguage,
  ContentProject,
  ContentProjectChatMessage,
  ContentProjectIdeaHit,
  ProductFrame,
} from "@/types/workspace";

/** Pastel card tones (same spirit as database-perso projects hub). */
export const CONTENT_PROJECT_CARD_TONES = [
  { bg: "bg-[#E7F0E4]", accent: "text-emerald-900/80" },
  { bg: "bg-[#E4EEF6]", accent: "text-sky-900/80" },
  { bg: "bg-[#F3EBE3]", accent: "text-stone-800/80" },
  { bg: "bg-[#E5F2EF]", accent: "text-teal-900/80" },
  { bg: "bg-[#F0E7EB]", accent: "text-rose-900/80" },
  { bg: "bg-[#ECEEF3]", accent: "text-slate-800/80" },
] as const;

export const MAX_CONTENT_PROJECT_CHAT_MESSAGES = 80;

export function newContentProjectMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function contentProjectCardTone(index: number | undefined) {
  const i = typeof index === "number" ? Math.abs(index) % CONTENT_PROJECT_CARD_TONES.length : 0;
  return CONTENT_PROJECT_CARD_TONES[i]!;
}

export function buildNewContentProject(
  id: string,
  opts?: {
    name?: string;
    brief?: string;
    emoji?: string;
    channelOwner?: ChannelOwner;
    productFrame?: ProductFrame;
    contentLanguage?: ContentLanguage;
    contentJob?: ContentJob;
    colorIndex?: number;
  },
): Omit<ContentProject, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
} {
  const now = new Date();
  return {
    id,
    name: (opts?.name || "Nouveau projet").trim() || "Nouveau projet",
    emoji: opts?.emoji?.trim() || "🎯",
    brief: (opts?.brief || "").trim(),
    channelOwner: opts?.channelOwner,
    productFrame: opts?.productFrame,
    contentLanguage: opts?.contentLanguage,
    contentJob: opts?.contentJob,
    chat: [],
    ideas: [],
    articleIds: [],
    colorIndex:
      typeof opts?.colorIndex === "number"
        ? opts.colorIndex
        : Math.floor(Math.random() * CONTENT_PROJECT_CARD_TONES.length),
    createdAt: now,
    updatedAt: now,
  };
}

export function appendContentProjectChat(
  project: ContentProject,
  messages: Omit<ContentProjectChatMessage, "id" | "createdAt">[],
  at = new Date().toISOString(),
): ContentProject {
  const nextChat = [
    ...(project.chat ?? []),
    ...messages.map((m) => ({
      id: newContentProjectMessageId(),
      role: m.role,
      content: m.content,
      createdAt: at,
    })),
  ].slice(-MAX_CONTENT_PROJECT_CHAT_MESSAGES);
  return { ...project, chat: nextChat, updatedAt: new Date(at) };
}

export function formatContentProjectDate(date: Date): string {
  try {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function formatSiblingProjectsSummary(
  siblings: Pick<ContentProject, "id" | "name" | "brief">[],
  activeId: string,
  max = 6,
): string {
  const others = siblings.filter((p) => p.id !== activeId).slice(0, max);
  if (others.length === 0) return "(aucun autre projet)";
  return others
    .map((p) => `- ${p.name}: ${(p.brief || "").trim().slice(0, 120) || "(brief vide)"}`)
    .join("\n");
}

export function sortIdeasByStars(ideas: ContentProjectIdeaHit[]): ContentProjectIdeaHit[] {
  return [...ideas].sort(
    (a, b) => b.stars - a.stars || a.title.localeCompare(b.title),
  );
}
