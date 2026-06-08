import {
  injectAuthorSteering,
  type AuthorSteeringPayload,
} from "@/lib/profile/author-steering-context";
import { normalizePostBrief } from "@/lib/articles/post-brief-objectives";
import type {
  ArticleNewsSource,
  ContentLanguage,
  PostBrief,
  PostObjective,
  PostObjectivePriority,
  RankedPostObjective,
} from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function buildBriefSuggestSystemPrompt(contentLanguage: ContentLanguage): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";

  return `You draft a LinkedIn post brief (${lang}) for a B2B author based on context (news story or pasted reference post).

Return JSON only:
{
  "objectives": [
    { "objective": "credibility" | "conversation" | "awareness" | "leads", "priority": 1 },
    { "objective": "...", "priority": 2 }
  ],
  "problem": string,
  "pointOfView": string,
  "proof": string
}

Rules:
- objectives: 1 to 3 items, unique objectives, priorities 1 (primary) then 2–3 if relevant
- priority 1 is required and must match the best fit for the angle
- problem: the topic, stakes, or tension the post comments on (for news/inspiration this is often the story itself — do NOT force a classic "customer pain point" if the source is factual news or analysis)
- pointOfView, proof: concise, specific, usable in prompts (1-3 sentences each)
- Align with the author's Persona excerpt and authorSteering (profile, news keywords, LinkedIn history) — do not invent fake metrics
- For news: react to the story, not a neutral recap
- For pasted post: propose a NEW angle for the author (not a paraphrase)`;
}

export function buildBriefSuggestUserPrompt(input: {
  mode: "news" | "inspiration";
  contentLanguage: ContentLanguage;
  personaExcerpt: string;
  newsSource?: ArticleNewsSource;
  inspirationText?: string;
  inspirationMeta?: Record<string, unknown>;
  authorSteering?: AuthorSteeringPayload | null;
}): string {
  return JSON.stringify(
    injectAuthorSteering(
      {
        mode: input.mode,
        personaExcerpt: input.personaExcerpt.slice(0, 6000),
        news: input.newsSource ?? null,
        referencePost: input.inspirationText?.trim().slice(0, 8000) ?? null,
        inspirationMeta: input.inspirationMeta ?? null,
      },
      input.authorSteering,
    ),
    null,
    2,
  );
}

function parseSuggestedObjectives(raw: {
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

export function normalizeSuggestedBrief(raw: {
  objectives?: unknown;
  objective?: unknown;
  problem?: unknown;
  pointOfView?: unknown;
  proof?: unknown;
}): PostBrief {
  return normalizePostBrief({
    objectives: parseSuggestedObjectives(raw),
    problem: typeof raw.problem === "string" ? raw.problem.trim() : "",
    pointOfView: typeof raw.pointOfView === "string" ? raw.pointOfView.trim() : "",
    proof: typeof raw.proof === "string" ? raw.proof.trim() : "",
  });
}
