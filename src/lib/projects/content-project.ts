import type {
  ArticleNewsSource,
  ChannelOwner,
  ContentJob,
  ContentLanguage,
  ContentProject,
  ContentProjectChatMessage,
  ContentProjectIdeaHit,
  CtaIntensity,
  EmojiLevel,
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
export const MIN_PROJECT_BRIEF_CHARS = 40;

export type LucyProposalField =
  | "contentLanguage"
  | "contentJob"
  | "channelOwner"
  | "productFrame"
  | "emojiLevel"
  | "preferredCtaStyle"
  | "includeSignaturePs"
  | "brief"
  | "angle"
  | "newsScan"
  | "readyToGenerate"
  | "refineHook"
  | "refineCta"
  | "refinePs"
  | "refineTone";

export type LucyPendingProposal = {
  field: LucyProposalField;
  value: string | boolean;
  label: string;
};

export type LucySuggestedIdea = {
  title: string;
  reason: string;
  stars?: number;
};

export type LucyChatResponse = {
  reply: string;
  pendingProposal?: LucyPendingProposal;
  suggestedIdea?: LucySuggestedIdea;
  /** Short clickable quick replies to answer Lucy's current question in one tap. */
  choices?: string[];
  /** Locked frame snapshot · applied when user validates readyToGenerate. */
  framePatch?: LucyFramePatch;
};

/** Parse Lucy's clickable quick-reply options (short strings). */
export function parseLucyChoices(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const label = typeof item === "string" ? item.trim().replace(/\s+/g, " ") : "";
    if (!label) continue;
    const clipped = label.slice(0, 80);
    const key = clipped.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clipped);
    if (out.length >= 6) break;
  }
  return out.length ? out : undefined;
}

const PROPOSAL_FIELDS = new Set<string>([
  "contentLanguage",
  "contentJob",
  "channelOwner",
  "productFrame",
  "emojiLevel",
  "preferredCtaStyle",
  "includeSignaturePs",
  "brief",
  "angle",
  "newsScan",
  "readyToGenerate",
  "refineHook",
  "refineCta",
  "refinePs",
  "refineTone",
]);

/** Cap living brief length when Lucy proposes an update. */
export const MAX_PROJECT_BRIEF_CHARS = 2000;

export function normalizeProposedBrief(raw: string): string | null {
  const text = raw
    .trim()
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
  if (text.length < MIN_PROJECT_BRIEF_CHARS) return null;
  return text.slice(0, MAX_PROJECT_BRIEF_CHARS);
}

/** Map Lucy locale variants (ES-MX, fr-FR, spanish…) onto ContentLanguage. */
export function normalizeContentLanguage(raw: unknown): ContentLanguage | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().toLowerCase().replace(/_/g, "-");
  if (v === "fr" || v.startsWith("fr-") || v.startsWith("fran")) return "fr";
  if (v === "en" || v.startsWith("en-") || v.startsWith("eng")) return "en";
  if (v === "es" || v.startsWith("es-") || v.startsWith("spa") || v.includes("castell")) {
    return "es";
  }
  return undefined;
}

export function normalizeContentJob(raw: unknown): ContentJob | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().toLowerCase();
  if (v === "teaser" || v === "explain" || v === "convert") return v;
  return undefined;
}

export type LucyFramePatch = {
  contentLanguage?: ContentLanguage;
  contentJob?: ContentJob;
  channelOwner?: ChannelOwner;
  productFrame?: ProductFrame;
  emojiLevel?: EmojiLevel;
  preferredCtaStyle?: CtaIntensity;
  includeSignaturePs?: boolean;
  /** Angle title → stored as a Lucy idea when provided. */
  angle?: string;
};

export function parseLucyFramePatch(raw: unknown): LucyFramePatch | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const patch: LucyFramePatch = {};
  const lang = normalizeContentLanguage(o.contentLanguage);
  if (lang) patch.contentLanguage = lang;
  const job = normalizeContentJob(o.contentJob);
  if (job) patch.contentJob = job;
  const channel = typeof o.channelOwner === "string" ? o.channelOwner.trim() : "";
  if (channel === "gregory" || channel === "la_mesa" || channel === "generic") {
    patch.channelOwner = channel;
  }
  const product = typeof o.productFrame === "string" ? o.productFrame.trim() : "";
  if (
    product === "la_mesa_dinners" ||
    product === "nextstep_market_entry" ||
    product === "generic"
  ) {
    patch.productFrame = product;
  }
  const emoji = typeof o.emojiLevel === "string" ? o.emojiLevel.trim() : "";
  if (emoji === "none" || emoji === "light" || emoji === "heavy") patch.emojiLevel = emoji;
  const cta = typeof o.preferredCtaStyle === "string" ? o.preferredCtaStyle.trim() : "";
  if (cta === "soft" || cta === "medium" || cta === "pushy") patch.preferredCtaStyle = cta;
  if (typeof o.includeSignaturePs === "boolean") patch.includeSignaturePs = o.includeSignaturePs;
  if (typeof o.angle === "string" && o.angle.trim()) {
    patch.angle = o.angle.trim().slice(0, 200);
  }
  return Object.keys(patch).length > 0 ? patch : undefined;
}

export function applyLucyFramePatch(
  project: ContentProject,
  patch: LucyFramePatch,
): ContentProject {
  const next: ContentProject = { ...project, updatedAt: new Date() };
  if (patch.contentLanguage) next.contentLanguage = patch.contentLanguage;
  if (patch.contentJob) next.contentJob = patch.contentJob;
  if (patch.channelOwner) next.channelOwner = patch.channelOwner;
  if (patch.productFrame) next.productFrame = patch.productFrame;
  if (patch.emojiLevel) next.emojiLevel = patch.emojiLevel;
  if (patch.preferredCtaStyle) next.preferredCtaStyle = patch.preferredCtaStyle;
  if (typeof patch.includeSignaturePs === "boolean") {
    next.includeSignaturePs = patch.includeSignaturePs;
  }
  if (patch.angle?.trim()) {
    const title = patch.angle.trim();
    const idea: ContentProjectIdeaHit = {
      id: newContentProjectMessageId(),
      title: title.slice(0, 200),
      stars: 4,
      reason: title.slice(0, 280),
      source: "lucy",
    };
    next.ideas = sortIdeasByStars([...(next.ideas ?? []), idea]);
  }
  return next;
}

/** Human-readable list of missing frame keys for UI errors. */
export function missingProjectFrameFields(
  project: Pick<ContentProject, "contentLanguage" | "contentJob" | "brief" | "ideas">,
): string[] {
  const missing: string[] = [];
  if (!project.contentLanguage) missing.push("contentLanguage");
  if (!project.contentJob) missing.push("contentJob");
  const hasIdea = (project.ideas?.length ?? 0) > 0;
  const hasBrief = project.brief.trim().length >= MIN_PROJECT_BRIEF_CHARS;
  if (!hasIdea && !hasBrief) missing.push("brief|idea");
  return missing;
}

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

/** Min frame for first draft: language + job + (idea or brief). */
export function isProjectFrameReady(
  project: Pick<ContentProject, "contentLanguage" | "contentJob" | "brief" | "ideas">,
): boolean {
  if (!project.contentLanguage) return false;
  if (!project.contentJob) return false;
  const hasIdea = (project.ideas?.length ?? 0) > 0;
  const hasBrief = project.brief.trim().length >= MIN_PROJECT_BRIEF_CHARS;
  return hasIdea || hasBrief;
}

export function parseLucyPendingProposal(raw: unknown): LucyPendingProposal | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const field = typeof o.field === "string" ? o.field : "";
  if (!PROPOSAL_FIELDS.has(field)) return undefined;
  const label = typeof o.label === "string" ? o.label.trim() : "";
  if (!label) return undefined;
  const value = o.value;
  if (typeof value !== "string" && typeof value !== "boolean") return undefined;
  if (typeof value === "string" && !value.trim() && field !== "newsScan" && field !== "readyToGenerate") {
    return undefined;
  }
  if (field === "brief" && typeof value === "string" && !normalizeProposedBrief(value)) {
    return undefined;
  }
  return {
    field: field as LucyProposalField,
    value:
      field === "brief" && typeof value === "string"
        ? (normalizeProposedBrief(value) as string)
        : typeof value === "string"
          ? value.trim()
          : value,
    label: label.slice(0, 120),
  };
}

export function parseLucySuggestedIdea(raw: unknown): LucySuggestedIdea | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  if (!title) return undefined;
  const reason = typeof o.reason === "string" ? o.reason.trim() : "";
  const stars =
    typeof o.stars === "number" && o.stars >= 3 && o.stars <= 5 ? o.stars : 4;
  return { title: title.slice(0, 200), reason: reason.slice(0, 280), stars };
}

export function parseLucyChatResponse(raw: unknown): LucyChatResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const reply = typeof o.reply === "string" ? o.reply.trim() : "";
  if (!reply) return null;
  return {
    reply,
    pendingProposal: parseLucyPendingProposal(o.pendingProposal),
    suggestedIdea: parseLucySuggestedIdea(o.suggestedIdea),
    choices: parseLucyChoices(o.choices),
    framePatch: parseLucyFramePatch(o.framePatch),
  };
}

/** Apply a validated frame proposal onto project fields (no side effects). */
export function applyLucyProposalToProject(
  project: ContentProject,
  proposal: LucyPendingProposal,
): ContentProject {
  const next = { ...project, updatedAt: new Date() };
  switch (proposal.field) {
    case "contentLanguage": {
      const lang = normalizeContentLanguage(proposal.value);
      if (lang) next.contentLanguage = lang;
      break;
    }
    case "contentJob": {
      const job = normalizeContentJob(proposal.value);
      if (job) next.contentJob = job;
      break;
    }
    case "channelOwner": {
      const v = String(proposal.value);
      if (v === "gregory" || v === "la_mesa" || v === "generic") next.channelOwner = v;
      break;
    }
    case "productFrame": {
      const v = String(proposal.value);
      if (v === "la_mesa_dinners" || v === "nextstep_market_entry" || v === "generic") {
        next.productFrame = v;
      }
      break;
    }
    case "emojiLevel": {
      const v = String(proposal.value);
      if (v === "none" || v === "light" || v === "heavy") next.emojiLevel = v;
      break;
    }
    case "preferredCtaStyle": {
      const v = String(proposal.value);
      if (v === "soft" || v === "medium" || v === "pushy") next.preferredCtaStyle = v;
      break;
    }
    case "includeSignaturePs":
      next.includeSignaturePs = Boolean(proposal.value);
      break;
    case "brief": {
      const brief = normalizeProposedBrief(String(proposal.value));
      if (brief) next.brief = brief;
      break;
    }
    case "angle": {
      const title = String(proposal.value).trim() || proposal.label;
      if (!title) break;
      const idea: ContentProjectIdeaHit = {
        id: newContentProjectMessageId(),
        title: title.slice(0, 200),
        stars: 4,
        reason: proposal.label.slice(0, 280),
        source: "lucy",
      };
      next.ideas = sortIdeasByStars([...(next.ideas ?? []), idea]);
      break;
    }
    default:
      break;
  }
  return next;
}

export function isRefineProposalField(field: LucyProposalField): boolean {
  return (
    field === "refineHook" ||
    field === "refineCta" ||
    field === "refinePs" ||
    field === "refineTone"
  );
}

export function refineInstructionFromProposal(proposal: LucyPendingProposal): string {
  const detail = typeof proposal.value === "string" ? proposal.value : proposal.label;
  switch (proposal.field) {
    case "refineHook":
      return `Rewrite the hook only. Instruction: ${detail}`;
    case "refineCta":
      return `Adjust the closing / CTA intention only. Instruction: ${detail}`;
    case "refinePs":
      return `Adjust the PS line only (identity PS only if user opted in). Instruction: ${detail}`;
    case "refineTone":
      return `Adjust tone across the post. Instruction: ${detail}`;
    default:
      return detail;
  }
}

export type ProjectValidatedChip = {
  field: LucyProposalField;
  label: string;
};

/** Build chips from currently persisted project prefs (for display under chat). */
export function buildValidatedChips(
  project: Pick<
    ContentProject,
    | "contentLanguage"
    | "contentJob"
    | "channelOwner"
    | "productFrame"
    | "preferredCtaStyle"
    | "includeSignaturePs"
    | "ideas"
  >,
): ProjectValidatedChip[] {
  const chips: ProjectValidatedChip[] = [];
  if (project.contentLanguage) {
    chips.push({
      field: "contentLanguage",
      label: project.contentLanguage.toUpperCase(),
    });
  }
  if (project.contentJob) {
    chips.push({ field: "contentJob", label: project.contentJob });
  }
  if (project.channelOwner && project.channelOwner !== "generic") {
    chips.push({ field: "channelOwner", label: project.channelOwner });
  }
  if (project.productFrame && project.productFrame !== "generic") {
    chips.push({ field: "productFrame", label: project.productFrame });
  }
  // emojiLevel stays chat-only with Lucy (no chip — avoid "validated" UI for a silent default).
  if (project.preferredCtaStyle) {
    chips.push({ field: "preferredCtaStyle", label: `cta:${project.preferredCtaStyle}` });
  }
  if (project.includeSignaturePs) {
    chips.push({ field: "includeSignaturePs", label: "PS signature" });
  }
  const top = sortIdeasByStars(project.ideas ?? [])[0];
  if (top) {
    chips.push({ field: "angle", label: top.title.slice(0, 40) });
  }
  return chips;
}

export type ContentProjectPatchFromProposal = Partial<
  Pick<
    ContentProject,
    | "contentLanguage"
    | "contentJob"
    | "channelOwner"
    | "productFrame"
    | "emojiLevel"
    | "preferredCtaStyle"
    | "includeSignaturePs"
    | "brief"
    | "ideas"
  >
>;

export function contentProjectPatchFromApplied(
  before: ContentProject,
  after: ContentProject,
): ContentProjectPatchFromProposal {
  const patch: ContentProjectPatchFromProposal = {};
  if (before.contentLanguage !== after.contentLanguage) {
    patch.contentLanguage = after.contentLanguage;
  }
  if (before.contentJob !== after.contentJob) patch.contentJob = after.contentJob;
  if (before.channelOwner !== after.channelOwner) patch.channelOwner = after.channelOwner;
  if (before.productFrame !== after.productFrame) patch.productFrame = after.productFrame;
  if (before.emojiLevel !== after.emojiLevel) patch.emojiLevel = after.emojiLevel;
  if (before.preferredCtaStyle !== after.preferredCtaStyle) {
    patch.preferredCtaStyle = after.preferredCtaStyle;
  }
  if (before.includeSignaturePs !== after.includeSignaturePs) {
    patch.includeSignaturePs = after.includeSignaturePs;
  }
  if (before.brief !== after.brief) patch.brief = after.brief;
  if (before.ideas !== after.ideas) patch.ideas = after.ideas;
  return patch;
}
