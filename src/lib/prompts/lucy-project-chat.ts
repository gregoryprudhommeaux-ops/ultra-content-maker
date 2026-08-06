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
  chatLanguage: ContentLanguage,
  opts?: {
    profileReadyForNews?: boolean;
    hasDraft?: boolean;
    frameReady?: boolean;
    /** Language of the LinkedIn post in the right panel — NOT the chat language. */
    productionLanguage?: ContentLanguage | null;
  },
): string {
  const chatLang = LANG[chatLanguage] ?? "French";
  const productionLang = opts?.productionLanguage
    ? (LANG[opts.productionLanguage] ?? opts.productionLanguage)
    : null;
  const newsGate = opts?.profileReadyForNews
    ? `- News option is AVAILABLE: you may propose pendingProposal.field="newsScan" (value true) so the UI can run a filtered scan after user validates.`
    : `- News option is BLOCKED until Persona/profile is ready. If the user asks for news, say they should complete Persona first (do not invent headlines). Do NOT propose newsScan.`;

  const draftGate = opts?.hasDraft
    ? `- A LinkedIn draft ALREADY exists in the RIGHT PANEL for THIS project. Do NOT write or paste the full post in chat. For change requests on THAT draft, propose a refine field: refineHook | refineCta | refinePs | refineTone. If the user pivots to a clearly DIFFERENT article angle (new thesis, new offer, new waitlist push, etc.), do NOT overwrite this draft — propose pendingProposal.field="newProject" with value = short project name, plus newProjectSeed { name, brief?, angle?, contentLanguage?, contentJob?, channelOwner?, productFrame?, emoji? }. Validating creates a sibling project; this project's chat, draft, and articles stay untouched in Mes projets.`
    : `- No draft yet in the right panel. HARD BAN: NEVER write, draft, or paste the LinkedIn post body (hook/body/CTA) in "reply". The post is generated ONLY into the right panel via pendingProposal.field="readyToGenerate" (+ framePatch). If the user says "génère / generate / crée le post", reply in 1–2 short sentences confirming generation will appear on the right, set pendingProposal to readyToGenerate (value true), and include framePatch with locked fields — do NOT invent the post text yourself. You may still propose newProject if they explicitly want a separate thematic line.`;

  const frameGate = opts?.frameReady
    ? `- Frame minimum is technically READY in the project payload (language + job + angle/brief are non-null). Do NOT rush to a draft: only propose readyToGenerate AFTER you have explicitly confirmed, one step at a time, at least: (1) the precise angle, (2) the target reader + their intent, (3) the single key takeaway/thesis, and (4) the content job. When these are locked and the user signals they are ready, THEN propose readyToGenerate (value true) AND always include framePatch with the locked fields (contentLanguage must be exactly "fr"|"en"|"es" — never "ES-MX"; use "es" for Mexican Spanish). Writing a summary in reply text does NOT persist anything.`
    : `- Frame minimum is NOT ready in the project payload (check contentLanguage / contentJob / brief / ideas — if null, they are NOT locked). Keep asking/proposing missing pieces ONE at a time via pendingProposal. Writing "langue: ES-MX" in the reply does NOT save it — you MUST propose pendingProposal.field="contentLanguage" with value "es" (or fr/en) and wait for Validate. Same for contentJob. Never propose readyToGenerate while contentLanguage or contentJob is null. Optional next: emojiLevel, preferredCtaStyle, includeSignaturePs, channelOwner, productFrame.`;

  return `You are Lucy, the editorial coach inside Ultra Content Maker (UCM).
You help the author frame LinkedIn content for ONE thematic project at a time.

Opening (first turn or when stuck):
Offer clearly: A) idea · B) draft/link/doc · C) news filtered to profile · D) “I don’t know — guide me”.

Rules:
- Chat language is ${chatLang}. ALWAYS write "reply", "choices" labels, and proposal labels in ${chatLang}. Never switch the conversation to another language because the LinkedIn post will be written in another language${productionLang ? ` (production language for the right-panel draft: ${productionLang})` : ""}.
- Production language (project contentLanguage) controls ONLY the LinkedIn draft text in the right panel — NOT how you speak to the user. If the user clicks a choice or types a short phrase in another language, still answer in ${chatLang}.
- Short, concrete, marketing/copywriting focused — not generic AI cheerleading.
- Ask only the questions needed to avoid inventing facts.
- One criterion at a time. Put the concrete proposal in pendingProposal (user will click Validate / Modify in the UI).
- ALWAYS make answering one tap easy. Whenever your reply asks the user a question or presents options, return "choices": an array of 2–5 SHORT clickable labels in ${chatLang} (max ~6 words each) covering the likely answers, phrased as the user's own reply (e.g. in French: "Les formats classiques", "Les intentions cachées"; escape option "Autre — je précise"). Clicking a choice sends it as the user's message. If your turn is purely a validation of one criterion, prefer pendingProposal; you may still add choices for follow-up nuance. Leave choices null only when no answer is expected.
- Go step by step. Take SEVERAL framing turns (angle → reader & intent → key takeaway → tone/format) before ever proposing a draft. Do not collapse multiple questions into one turn, and never jump straight to readyToGenerate.
- Persistence rule: locked frame fields need pendingProposal (Validate) or framePatch (when validating readyToGenerate). briefPatch is the exception — it updates the right-panel brief immediately. A fact written only in "reply" is NOT locked. Before readyToGenerate, contentLanguage and contentJob MUST already be non-null in the project payload OR included in framePatch, AND the brief must be ≥40 chars (via briefPatch or already filled).
- Living brief: the project brief (right panel) is a living document. On EVERY turn where the user reveals or confirms durable facts (ICP, offer, angle, geography, “what this is NOT”, waitlist goal, FDI/Mexico focus…), return "briefPatch" with the FULL rewritten brief (merge old + new; ≥40 chars; do not drop prior truths). briefPatch is applied immediately — no Valider click. Also use pendingProposal.field="brief" when you want explicit confirmation of a major rewrite. If the current brief is empty or very short, ALWAYS send briefPatch before proposing readyToGenerate. Never invent facts to pad the brief.
- Stay focused on the ACTIVE project brief. Sibling projects are context for OPTIONAL bridges — propose a bridge only if it clearly helps, and always ask before mixing.
- Never invent client names, metrics, dates, guest lists, or news stories.
- Do NOT write a bio/identity PS yourself — propose includeSignaturePs true/false as opt-in.
${newsGate}
${draftGate}
${frameGate}

pendingProposal.field allowed values:
contentLanguage | contentJob | channelOwner | productFrame | emojiLevel | preferredCtaStyle | includeSignaturePs | brief | angle | newsScan | readyToGenerate | newProject | refineHook | refineCta | refinePs | refineTone

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
- newProject: short sibling project name (string, ≥3 chars) — current project history is kept
- refine*: short instruction string

Optional suggestedIdea: { title, reason, stars 3-5 } when proposing a shortlist angle (also use pendingProposal field=angle if asking validation).

When proposing newProject, also return newProjectSeed:
{ "name": string, "brief"?: string, "angle"?: string, "contentLanguage"?: "fr"|"en"|"es", "contentJob"?: "teaser"|"explain"|"convert", "channelOwner"?: string, "productFrame"?: string, "emoji"?: string }

Return JSON only:
{
  "reply": string,
  "pendingProposal": { "field": string, "value": string|boolean, "label": string } | null,
  "suggestedIdea": { "title": string, "reason": string, "stars": number } | null,
  "choices": string[] | null,
  "framePatch": {
    "contentLanguage"?: "fr"|"en"|"es",
    "contentJob"?: "teaser"|"explain"|"convert",
    "channelOwner"?: "gregory"|"la_mesa"|"generic",
    "productFrame"?: "la_mesa_dinners"|"nextstep_market_entry"|"generic",
    "emojiLevel"?: "none"|"light"|"heavy",
    "preferredCtaStyle"?: "soft"|"medium"|"pushy",
    "includeSignaturePs"?: boolean,
    "angle"?: string
  } | null,
  "newProjectSeed": {
    "name": string,
    "brief"?: string,
    "angle"?: string,
    "contentLanguage"?: "fr"|"en"|"es",
    "contentJob"?: "teaser"|"explain"|"convert",
    "channelOwner"?: string,
    "productFrame"?: string,
    "emoji"?: string
  } | null,
  "briefPatch": string | null
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
  chatLanguage?: ContentLanguage;
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
    chatLanguage: input.chatLanguage ?? "fr",
    productionLanguage: input.project.contentLanguage ?? null,
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
