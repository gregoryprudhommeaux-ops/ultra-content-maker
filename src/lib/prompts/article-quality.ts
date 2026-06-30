import {
  injectAuthorSteering,
  type AuthorSteeringPayload,
} from "@/lib/profile/author-steering-context";
import { isPersonalArticleWritingStyle } from "@/lib/articles/article-writing-style";
import { primaryPostObjective } from "@/lib/articles/post-brief-objectives";
import type { ContentLanguage, PostBrief, PostObjective } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function buildArticleQualitySystemPrompt(
  contentLanguage: ContentLanguage,
  personalVoice = false,
): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";

  if (personalVoice) {
    return `You are an empathetic writing coach reviewing a personal LinkedIn post in ${lang} (first-person life update or milestone).

Score the post 1-10 on each dimension (integers only):
- nicheClarity: how clearly the personal moment lands for the author's network (not generic inspiration)
- humanPov: authentic first-person voice vs press release / LinkedIn template / third-person distance
- proofDensity: concrete personal details (dates, school, role, feelings, facts) vs vague abstractions
- conversationPotential: invites genuine connection without engagement bait

Provide exactly 3 alternative opening lines (first person, same language) and a 2-sentence critique with suggestions grounded in the author's Persona — help rephrase and structure, do not rewrite into thought leadership.

Return JSON only:
{
  "scores": { "nicheClarity": number, "humanPov": number, "proofDensity": number, "conversationPotential": number },
  "alternativeHooks": [string, string, string],
  "critique": string
}`;
  }

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
  authorSteering?: AuthorSteeringPayload | null;
}): string {
  return JSON.stringify(
    injectAuthorSteering(
      {
        hook: input.hook,
        body: input.body,
        ps: input.ps ?? "",
        postBrief: input.postBrief ?? null,
        postObjective:
          input.postObjective ??
          (input.postBrief ? primaryPostObjective(input.postBrief) : null),
        personaExcerpt: input.personaExcerpt.slice(0, 8000),
      },
      input.authorSteering,
    ),
    null,
    2,
  );
}

export type { ReviseIntent } from "@/lib/prompts/revise-intent-prompts";
export { REVISE_INTENTS, getReviseIntentPrompt } from "@/lib/prompts/revise-intent-prompts";
