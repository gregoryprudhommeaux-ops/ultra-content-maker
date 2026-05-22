import type { ContentLanguage, PostBrief, PostObjective } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function buildArticleQualitySystemPrompt(contentLanguage: ContentLanguage): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";

  return `You are a senior LinkedIn B2B editor scoring posts for platform-native authority content in ${lang}.

Score the post 1-10 on each dimension (integers only):
- nicheClarity: specific to a defined ICP vs generic "everyone"
- humanPov: distinct author voice vs AI slop / clichés
- proofDensity: concrete proof visible (case, metric, observation) vs abstract advice
- conversationPotential: invites thoughtful expert replies vs engagement bait

Also provide exactly 3 alternative hooks (first lines only, same language as post) and a 2-sentence critique.

Return JSON only:
{
  "scores": { "nicheClarity": number, "humanPov": number, "proofDensity": number, "conversationPotential": number },
  "alternativeHooks": [string, string, string],
  "critique": string
}`;
}

export function buildArticleQualityUserPrompt(input: {
  hook: string;
  body: string;
  ps?: string;
  postBrief?: PostBrief;
  postObjective?: PostObjective;
  personaExcerpt: string;
}): string {
  return JSON.stringify(
    {
      hook: input.hook,
      body: input.body,
      ps: input.ps ?? "",
      postBrief: input.postBrief ?? null,
      postObjective: input.postObjective ?? input.postBrief?.objective ?? null,
      personaExcerpt: input.personaExcerpt.slice(0, 8000),
    },
    null,
    2,
  );
}

export type { ReviseIntent } from "@/lib/prompts/revise-intent-prompts";
export { REVISE_INTENTS, getReviseIntentPrompt } from "@/lib/prompts/revise-intent-prompts";
