import type { ArticleNewsSource, ContentLanguage, PostBrief } from "@/types/workspace";

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
  "objective": "credibility" | "conversation" | "awareness" | "leads",
  "problem": string,
  "pointOfView": string,
  "proof": string
}

Rules:
- objective is required and must match the best fit for the angle
- problem, pointOfView, proof: concise, specific, usable in prompts (1-3 sentences each)
- Align with the author's Persona excerpt — do not invent fake metrics
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
}): string {
  return JSON.stringify(
    {
      mode: input.mode,
      personaExcerpt: input.personaExcerpt.slice(0, 6000),
      news: input.newsSource ?? null,
      referencePost: input.inspirationText?.trim().slice(0, 8000) ?? null,
      inspirationMeta: input.inspirationMeta ?? null,
    },
    null,
    2,
  );
}

export function normalizeSuggestedBrief(raw: {
  objective?: unknown;
  problem?: unknown;
  pointOfView?: unknown;
  proof?: unknown;
}): PostBrief {
  const objective =
    raw.objective === "awareness" ||
    raw.objective === "credibility" ||
    raw.objective === "conversation" ||
    raw.objective === "leads"
      ? raw.objective
      : "credibility";

  return {
    objective,
    problem: typeof raw.problem === "string" ? raw.problem.trim() : "",
    pointOfView: typeof raw.pointOfView === "string" ? raw.pointOfView.trim() : "",
    proof: typeof raw.proof === "string" ? raw.proof.trim() : "",
  };
}
