import type {
  ArticleNewsSource,
  ChannelOwner,
  ContentJob,
  ContentLanguage,
  ContentProject,
  ContentProjectChatMessage,
  ContentProjectIdeaHit,
  CtaIntensity,
  NewsSuggestion,
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

export function formatContentProjectDate(
  date: Date,
  locale: string = "en-US",
): string {
  try {
    return date.toLocaleDateString(locale, {
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

/** Combine project news keywords + brief snippet for /api/news/suggestions. */
export function buildProjectNewsInterestQuery(
  project: Pick<ContentProject, "name" | "brief" | "newsInterestQuery">,
): string {
  const explicit = project.newsInterestQuery?.trim() ?? "";
  if (explicit) return explicit.slice(0, 280);
  const briefBits = project.brief
    .trim()
    .split(/[\n,;·|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2)
    .slice(0, 6);
  const parts = [project.name.trim(), ...briefBits].filter(Boolean);
  return parts.join(" · ").slice(0, 280);
}

export function ideaHitFromNewsSuggestion(
  news: NewsSuggestion,
  stars = 4,
): ContentProjectIdeaHit {
  return {
    id: newContentProjectMessageId(),
    title: news.title.trim().slice(0, 200),
    stars,
    reason: (news.summary || news.sourceName || "Actu profil").trim().slice(0, 280),
    source: "news",
    url: news.url,
    sourceName: news.sourceName,
    summary: news.summary,
    publishedAt: news.publishedAt,
  };
}

export function newsSourceFromIdeaHit(
  idea: ContentProjectIdeaHit | null | undefined,
): ArticleNewsSource | undefined {
  if (!idea?.url?.trim() || !idea.title?.trim()) return undefined;
  return {
    title: idea.title,
    summary: idea.summary?.trim() || idea.reason || idea.title,
    url: idea.url.trim(),
    publishedAt: idea.publishedAt?.trim() || new Date().toISOString().slice(0, 10),
    sourceName: idea.sourceName,
  };
}

const CTA_HINT: Record<CtaIntensity, string> = {
  soft: "Prefer a soft closing intention (curiosity / conversation), no hard sell.",
  medium: "Prefer a medium closing intention (clear next step, still conversational).",
  pushy: "Prefer a direct closing intention (explicit ask), still LinkedIn-native.",
};

/** Resolve which shortlisted idea drives generation (explicit pick → top stars). */
export function resolveGenerateIdea(
  ideas: ContentProjectIdeaHit[] | undefined,
  selectedIdeaId?: string | null,
): ContentProjectIdeaHit | undefined {
  const list = ideas ?? [];
  if (selectedIdeaId) {
    const hit = list.find((i) => i.id === selectedIdeaId);
    if (hit) return hit;
  }
  return sortIdeasByStars(list)[0];
}

export function ctaPreferenceHint(style: CtaIntensity | undefined): string | undefined {
  if (!style) return undefined;
  return CTA_HINT[style];
}
