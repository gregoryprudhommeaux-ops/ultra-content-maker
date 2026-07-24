import {
  injectAuthorSteering,
  type AuthorSteeringPayload,
} from "@/lib/profile/author-steering-context";
import { normalizePostBrief } from "@/lib/articles/post-brief-objectives";
import { buildAntiLinkedInSlopRules } from "@/lib/prompts/anti-linkedin-slop";
import { languageLabel, languageOnlyRule } from "@/lib/prompts/language-consistency";
import type { ContentLanguage, PostBrief, PostObjective, PostObjectivePriority, RankedPostObjective } from "@/types/workspace";

export type InterviewQuestion = {
  id: string;
  text: string;
};

export type InterviewAnswer = {
  questionId: string;
  questionText: string;
  answer: string;
};

export type InterviewSessionPack = {
  storytellingTips: string[];
  nextAngles: { title: string; angle: string; pillar?: string }[];
};

export type InterviewExtractResult = {
  brief: PostBrief;
  sessionPack: InterviewSessionPack;
  matterSummary: string;
};

export function buildInterviewQuestionsSystemPrompt(contentLanguage: ContentLanguage): string {
  const lang = languageLabel(contentLanguage);
  return `You design a short LinkedIn extraction interview (${lang}) for a B2B author.

Goal: surface lived experience, decisions, concrete details, and opinions — NOT generic LinkedIn themes.

${languageOnlyRule(contentLanguage)}

Return JSON only:
{
  "questions": [
    { "id": "q1", "text": "..." }
  ]
}

Rules:
- Exactly 6 questions (ids q1…q6)
- Short, spoken-friendly questions (one idea each)
- Ground in the author's Persona / Topic DNA / steering when provided
- Mix: recent situation, decision under tension, concrete detail (number/date/scene), belief they defend, lesson transferable, audience stake
- Never invent facts about the author
- Avoid motivational coach tone and survey-style fluff
- Questions in ${lang}`;
}

export function buildInterviewQuestionsUserPrompt(input: {
  contentLanguage: ContentLanguage;
  personaExcerpt: string;
  authorSteering?: AuthorSteeringPayload | null;
  contentNiche?: string | null;
}): string {
  return JSON.stringify(
    injectAuthorSteering(
      {
        task: "interview_questions",
        personaExcerpt: input.personaExcerpt.slice(0, 6000),
        contentNiche: input.contentNiche?.trim() || null,
      },
      input.authorSteering,
    ),
    null,
    2,
  );
}

export function buildInterviewExtractSystemPrompt(contentLanguage: ContentLanguage): string {
  const lang = languageLabel(contentLanguage);
  return `You extract a LinkedIn post brief and a light session pack from an interview transcript (${lang}).

${languageOnlyRule(contentLanguage)}
${buildAntiLinkedInSlopRules(contentLanguage)}

Return JSON only:
{
  "objectives": [
    { "objective": "credibility" | "conversation" | "awareness" | "leads", "priority": 1 }
  ],
  "problem": string,
  "pointOfView": string,
  "proof": string,
  "matterSummary": string,
  "storytellingTips": [string, string, string],
  "nextAngles": [
    { "title": string, "angle": string, "pillar": "market" | "expertise" | "build_in_public" }
  ]
}

Rules:
- Matter-first: use ONLY what the author said. Never invent clients, metrics, or scenes.
- problem / pointOfView / proof: concise, usable as a post brief (1–3 sentences each)
- objectives: 1–3 ranked items
- matterSummary: 2–4 sentences capturing the strongest raw material
- storytellingTips: exactly 3 tips — (1) strongest message, (2) what to reinforce, (3) lesson for next post
- nextAngles: 3 to 5 unused angles from THIS interview (not the primary brief angle)
- pillar: market = niche/trends/opinion on market · expertise = method/advice · build_in_public = behind-the-scenes / journey
- Prefer concrete details (numbers, dates, named tension) when present in answers
- Output all user-facing strings in ${lang}`;
}

export function buildInterviewExtractUserPrompt(input: {
  contentLanguage: ContentLanguage;
  personaExcerpt: string;
  answers: InterviewAnswer[];
  authorSteering?: AuthorSteeringPayload | null;
  contentNiche?: string | null;
}): string {
  const transcript = input.answers
    .filter((a) => a.answer.trim())
    .map((a, i) => `Q${i + 1}: ${a.questionText}\nA${i + 1}: ${a.answer.trim()}`)
    .join("\n\n");

  return JSON.stringify(
    injectAuthorSteering(
      {
        task: "interview_extract",
        personaExcerpt: input.personaExcerpt.slice(0, 6000),
        contentNiche: input.contentNiche?.trim() || null,
        transcript: transcript.slice(0, 12000),
      },
      input.authorSteering,
    ),
    null,
    2,
  );
}

function parseObjectives(raw: {
  objectives?: unknown;
  objective?: unknown;
}): RankedPostObjective[] {
  if (Array.isArray(raw.objectives)) {
    const parsed = raw.objectives
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const objective = (item as { objective?: unknown }).objective;
        const priority = (item as { priority?: unknown }).priority;
        if (
          objective !== "awareness" &&
          objective !== "credibility" &&
          objective !== "conversation" &&
          objective !== "leads"
        ) {
          return null;
        }
        if (priority !== 1 && priority !== 2 && priority !== 3) return null;
        return { objective, priority: priority as PostObjectivePriority };
      })
      .filter((item): item is RankedPostObjective => item != null);
    if (parsed.length > 0) return parsed;
  }

  const legacy = raw.objective as PostObjective | undefined;
  if (
    legacy === "awareness" ||
    legacy === "credibility" ||
    legacy === "conversation" ||
    legacy === "leads"
  ) {
    return [{ objective: legacy, priority: 1 }];
  }

  return [{ objective: "credibility", priority: 1 }];
}

export function normalizeInterviewQuestions(raw: unknown): InterviewQuestion[] {
  if (!raw || typeof raw !== "object") return [];
  const list = (raw as { questions?: unknown }).questions;
  if (!Array.isArray(list)) return [];
  return list
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const text = String((item as { text?: unknown }).text ?? "").trim();
      if (text.length < 8) return null;
      const id = String((item as { id?: unknown }).id ?? `q${index + 1}`).trim() || `q${index + 1}`;
      return { id, text };
    })
    .filter((q): q is InterviewQuestion => q != null)
    .slice(0, 8);
}

export function normalizeInterviewExtract(raw: {
  objectives?: unknown;
  objective?: unknown;
  problem?: unknown;
  pointOfView?: unknown;
  proof?: unknown;
  matterSummary?: unknown;
  storytellingTips?: unknown;
  nextAngles?: unknown;
}): InterviewExtractResult {
  const brief = normalizePostBrief({
    objectives: parseObjectives(raw),
    problem: typeof raw.problem === "string" ? raw.problem : "",
    pointOfView: typeof raw.pointOfView === "string" ? raw.pointOfView : "",
    proof: typeof raw.proof === "string" ? raw.proof : "",
  });

  const tips = Array.isArray(raw.storytellingTips)
    ? raw.storytellingTips
        .map((t) => String(t ?? "").trim())
        .filter((t) => t.length >= 8)
        .slice(0, 3)
    : [];

  const nextAngles = Array.isArray(raw.nextAngles)
    ? raw.nextAngles
        .flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const title = String((item as { title?: unknown }).title ?? "").trim();
          const angle = String((item as { angle?: unknown }).angle ?? "").trim();
          if (title.length < 3 || angle.length < 8) return [];
          const pillarRaw = String((item as { pillar?: unknown }).pillar ?? "").trim();
          const pillar =
            pillarRaw === "market" ||
            pillarRaw === "expertise" ||
            pillarRaw === "build_in_public"
              ? pillarRaw
              : undefined;
          return [{ title, angle, ...(pillar ? { pillar } : {}) }];
        })
        .slice(0, 5)
    : [];

  return {
    brief,
    matterSummary:
      typeof raw.matterSummary === "string" ? raw.matterSummary.trim() : "",
    sessionPack: {
      storytellingTips: tips,
      nextAngles,
    },
  };
}
