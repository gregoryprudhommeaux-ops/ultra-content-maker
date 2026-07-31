import type {
  ContentLanguage,
  ContentProject,
  ContentProjectChatMessage,
  ContentProjectIdeaHit,
  PostBrief,
} from "@/types/workspace";

const LANG: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

/**
 * Lucy UCM — project-scoped editorial coach.
 * Focus = active project; siblings = optional bridges only (never merge lines).
 */
export function buildLucyProjectChatSystemPrompt(
  contentLanguage: ContentLanguage,
  opts?: { profileReadyForNews?: boolean },
): string {
  const lang = LANG[contentLanguage] ?? "French";
  const newsGate = opts?.profileReadyForNews
    ? `- News option is AVAILABLE: you may offer “actu filtrée sur le profil / projet” and ask which angle to take.`
    : `- News option is BLOCKED until Persona/profile is ready. If the user asks for news, say they should complete Persona first (do not invent headlines).`;

  return `You are Lucy, the editorial coach inside Ultra Content Maker (UCM).
You help the author frame LinkedIn content for ONE thematic project at a time.

Opening (first turn or when stuck):
Offer clearly: A) idea · B) draft/link/doc · C) news filtered to profile · D) “I don’t know — guide me”.

Rules:
- Reply in ${lang}. Short, concrete, marketing/copywriting focused — not generic AI cheerleading.
- Ask only the questions needed to avoid inventing facts (LinkedIn yes/no, job teaser|explain|convert, language, CTA, PS identity opt-in, emojis, translation…).
- One or two questions max per turn, or a crisp summary + next step.
- Stay focused on the ACTIVE project brief. Sibling projects are context for OPTIONAL bridges — propose a bridge only if it clearly helps, and always ask before mixing.
- Never invent client names, metrics, dates, guest lists, or news stories.
- Do NOT write a bio/identity PS yourself — ask if they want one later as an opt-in.
${newsGate}

When the user is ready to write, summarize the frame (job, language, CTA/PS/emojis) and invite them to click “Generate a LinkedIn draft” in the UI.

Return JSON only: { "reply": string }`;
}

export function buildLucyProjectChatUserPayload(input: {
  project: Pick<
    ContentProject,
    | "name"
    | "brief"
    | "channelOwner"
    | "productFrame"
    | "contentLanguage"
    | "contentJob"
  >;
  ideas: ContentProjectIdeaHit[];
  siblings: Pick<ContentProject, "id" | "name" | "brief">[];
  projectId: string;
  history: ContentProjectChatMessage[];
  userMessage: string;
  personaExcerpt?: string;
  profileReadyForNews?: boolean;
}): string {
  const shortlist =
    input.ideas.length === 0
      ? "(aucune idée shortlistée)"
      : input.ideas
          .slice(0, 12)
          .map((i) => `- ${i.title} · ${"★".repeat(Math.min(5, i.stars))} · ${i.reason}`)
          .join("\n");

  const historyBlock = input.history
    .slice(-20)
    .map((m) => `${m.role === "user" ? "User" : "Lucy"}: ${m.content.slice(0, 900)}`)
    .join("\n\n");

  const siblings =
    input.siblings.filter((p) => p.id !== input.projectId).length === 0
      ? "(aucun autre projet)"
      : input.siblings
          .filter((p) => p.id !== input.projectId)
          .slice(0, 6)
          .map((p) => `- ${p.name}: ${(p.brief || "").trim().slice(0, 120) || "(brief vide)"}`)
          .join("\n");

  return JSON.stringify({
    activeProject: {
      name: input.project.name,
      brief: input.project.brief.slice(0, 2500),
      channelOwner: input.project.channelOwner ?? null,
      productFrame: input.project.productFrame ?? null,
      contentLanguage: input.project.contentLanguage ?? null,
      contentJob: input.project.contentJob ?? null,
    },
    siblingProjects: siblings,
    ideaShortlist: shortlist,
    personaExcerpt: (input.personaExcerpt ?? "").slice(0, 1800) || null,
    profileReadyForNews: Boolean(input.profileReadyForNews),
    history: historyBlock || null,
    userMessage: input.userMessage.slice(0, 2000),
  });
}

/** Build a minimal PostBrief from project fields for generation. */
export function buildPostBriefFromContentProject(
  project: Pick<
    ContentProject,
    "name" | "brief" | "channelOwner" | "productFrame" | "contentJob" | "ideas"
  >,
): PostBrief {
  const topIdea = [...(project.ideas ?? [])].sort((a, b) => b.stars - a.stars)[0];
  const problem =
    project.brief.trim().slice(0, 400) ||
    `Contenu LinkedIn pour le projet « ${project.name} ».`;
  const pointOfView = topIdea
    ? `${topIdea.title}. ${topIdea.reason}`.trim().slice(0, 300)
    : `Angle aligné sur le projet « ${project.name} ».`;
  const proof =
    "S’appuyer sur le Persona et les faits fournis dans le brief projet — ne rien inventer.";

  return {
    objectives: [{ objective: "credibility", priority: 1 }],
    problem,
    pointOfView,
    proof,
    contentJob: project.contentJob,
    channelOwner: project.channelOwner,
    productFrame: project.productFrame,
  };
}
