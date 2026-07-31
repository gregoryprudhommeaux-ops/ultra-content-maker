import {
  ctaPreferenceHint,
  isProjectFrameReady,
  resolveGenerateIdea,
} from "@/lib/projects/content-project";
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
 * Criteria are proposed one-at-a-time via pendingProposal for user validation.
 */
export function buildLucyProjectChatSystemPrompt(
  contentLanguage: ContentLanguage,
  opts?: { profileReadyForNews?: boolean; hasDraft?: boolean; frameReady?: boolean },
): string {
  const lang = LANG[contentLanguage] ?? "French";
  const newsGate = opts?.profileReadyForNews
    ? `- News option is AVAILABLE: you may propose pendingProposal.field="newsScan" (value true) so the UI can run a filtered scan after user validates.`
    : `- News option is BLOCKED until Persona/profile is ready. If the user asks for news, say they should complete Persona first (do not invent headlines). Do NOT propose newsScan.`;

  const draftGate = opts?.hasDraft
    ? `- A LinkedIn draft ALREADY exists in the right panel. Do NOT write the full post in chat. For change requests, propose a refine field: refineHook | refineCta | refinePs | refineTone with a short instruction in value + label.`
    : `- No draft yet. NEVER write the LinkedIn post body in chat. Frame first; when frame is ready propose readyToGenerate.`;

  const frameGate = opts?.frameReady
    ? `- Frame minimum is technically READY (language + job + angle/brief). Do NOT rush to a draft: only propose readyToGenerate AFTER you have explicitly confirmed, one step at a time, at least: (1) the precise angle, (2) the target reader + their intent, (3) the single key takeaway/thesis, and (4) the content job. When these are locked and the user signals they are ready, THEN propose readyToGenerate (value true). If any is still fuzzy, keep framing instead.`
    : `- Frame minimum is NOT ready. Keep asking/proposing missing pieces ONE at a time: contentLanguage, contentJob, and a precise angle (or propose a living brief). Optional next: emojiLevel, preferredCtaStyle, includeSignaturePs, channelOwner, productFrame.`;

  return `You are Lucy, the editorial coach inside Ultra Content Maker (UCM).
You help the author frame LinkedIn content for ONE thematic project at a time.

Opening (first turn or when stuck):
Offer clearly: A) idea · B) draft/link/doc · C) news filtered to profile · D) “I don’t know — guide me”.

Rules:
- Reply in ${lang}. Short, concrete, marketing/copywriting focused — not generic AI cheerleading.
- Ask only the questions needed to avoid inventing facts.
- One criterion at a time. Put the concrete proposal in pendingProposal (user will click Validate / Modify in the UI).
- ALWAYS make answering one tap easy. Whenever your reply asks the user a question or presents options, return "choices": an array of 2–5 SHORT clickable labels (max ~6 words each) covering the likely answers, phrased as the user's own reply (e.g. "Les formats classiques", "Les intentions cachées"). Add an escape option like "Autre — je précise" when relevant. Clicking a choice sends it as the user's message. If your turn is purely a validation of one criterion, prefer pendingProposal; you may still add choices for follow-up nuance. Leave choices null only when no answer is expected.
- Go step by step. Take SEVERAL framing turns (angle → reader & intent → key takeaway → tone/format) before ever proposing a draft. Do not collapse multiple questions into one turn, and never jump straight to readyToGenerate.
- Living brief: the project brief is a living document. When the user reveals durable facts (ICP, offer, positioning, “what this is NOT”, tone, geography, format…), propose pendingProposal.field="brief" with the FULL rewritten brief in value (merge old + new; do not drop prior truths). Label = short summary of what changed. Propose a brief update only when there is a real delta — not every turn. Never invent facts to pad the brief.
- Stay focused on the ACTIVE project brief. Sibling projects are context for OPTIONAL bridges — propose a bridge only if it clearly helps, and always ask before mixing.
- Never invent client names, metrics, dates, guest lists, or news stories.
- Do NOT write a bio/identity PS yourself — propose includeSignaturePs true/false as opt-in.
${newsGate}
${draftGate}
${frameGate}

pendingProposal.field allowed values:
contentLanguage | contentJob | channelOwner | productFrame | emojiLevel | preferredCtaStyle | includeSignaturePs | brief | angle | newsScan | readyToGenerate | refineHook | refineCta | refinePs | refineTone

pendingProposal.value:
- contentLanguage: "fr"|"en"|"es"
- contentJob: "teaser"|"explain"|"convert"
- channelOwner: "gregory"|"la_mesa"|"generic"
- productFrame: "la_mesa_dinners"|"nextstep_market_entry"|"generic"
- emojiLevel: "none"|"light"|"heavy"
- preferredCtaStyle: "soft"|"medium"|"pushy"
- includeSignaturePs: true|false
- brief: full updated brief text (living doc; ≥40 chars; merge prior + new facts from the chat)
- angle: short angle title string
- newsScan / readyToGenerate: true
- refine*: short instruction string

Optional suggestedIdea: { title, reason, stars 3-5 } when proposing a shortlist angle (also use pendingProposal field=angle if asking validation).

Return JSON only:
{
  "reply": string,
  "pendingProposal": { "field": string, "value": string|boolean, "label": string } | null,
  "suggestedIdea": { "title": string, "reason": string, "stars": number } | null,
  "choices": string[] | null
}`;
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
    | "emojiLevel"
    | "preferredCtaStyle"
    | "includeSignaturePs"
    | "ideas"
  >;
  ideas: ContentProjectIdeaHit[];
  siblings: Pick<ContentProject, "id" | "name" | "brief">[];
  projectId: string;
  history: ContentProjectChatMessage[];
  userMessage: string;
  personaExcerpt?: string;
  profileReadyForNews?: boolean;
  hasDraft?: boolean;
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

  const frameReady = isProjectFrameReady({
    contentLanguage: input.project.contentLanguage,
    contentJob: input.project.contentJob,
    brief: input.project.brief,
    ideas: input.ideas,
  });

  return JSON.stringify({
    activeProject: {
      name: input.project.name,
      brief: input.project.brief.slice(0, 2500),
      channelOwner: input.project.channelOwner ?? null,
      productFrame: input.project.productFrame ?? null,
      contentLanguage: input.project.contentLanguage ?? null,
      contentJob: input.project.contentJob ?? null,
      emojiLevel: input.project.emojiLevel ?? null,
      preferredCtaStyle: input.project.preferredCtaStyle ?? null,
      includeSignaturePs: Boolean(input.project.includeSignaturePs),
    },
    frameReady,
    hasDraft: Boolean(input.hasDraft),
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
    | "name"
    | "brief"
    | "channelOwner"
    | "productFrame"
    | "contentJob"
    | "ideas"
    | "preferredCtaStyle"
  >,
  opts?: { selectedIdeaId?: string | null },
): PostBrief {
  const topIdea = resolveGenerateIdea(project.ideas, opts?.selectedIdeaId);
  const problem =
    project.brief.trim().slice(0, 400) ||
    `Contenu LinkedIn pour le projet « ${project.name} ».`;
  const pointOfView = topIdea
    ? `${topIdea.title}. ${topIdea.reason}`.trim().slice(0, 300)
    : `Angle aligné sur le projet « ${project.name} ».`;
  const ctaHint = ctaPreferenceHint(project.preferredCtaStyle);
  const proof = [
    "S’appuyer sur le Persona et les faits fournis dans le brief projet — ne rien inventer.",
    ctaHint,
  ]
    .filter(Boolean)
    .join(" ");

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
