import type { LlmConfig } from "@/lib/llm/config";
import { chatCompletionJson } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildCreationStrategyGuideSystemPrompt,
  buildCreationStrategyGuideUserPrompt,
  normalizeCreationStrategyGuide,
} from "@/lib/prompts/creation-strategy-guide";
import {
  buildLinkedInActivityFetchSystemPrompt,
  buildLinkedInActivityFetchUserPrompt,
  normalizeLinkedInActivityPosts,
  type LinkedInActivityFetchLlmResult,
  type LinkedInActivityPostLlm,
} from "@/lib/prompts/linkedin-activity-fetch";
import { normalizeLinkedInActivityUrl } from "@/lib/linkedin/activity-url";
import type { AuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import type { ContentLanguage, CreationStrategyGuide } from "@/types/workspace";

export type AnalyzeCreationStrategyInput = {
  activityUrl: string;
  contentLanguage: ContentLanguage;
  personaPromptText: string;
  authorContext?: {
    roleTitle?: string;
    positioningLine?: string;
    audienceFocus?: string;
  };
  /** Angle, keywords, or leads to steer theme generation */
  userSteering?: string;
  /** Full profile, audience, enrichment, sources, LinkedIn cache */
  authorSteering?: AuthorSteeringPayload | null;
  /** Primary LLM for strategy synthesis */
  strategyLlm: LlmConfig;
  /** Must be Perplexity (or env Perplexity) for activity fetch */
  fetchLlm: LlmConfig;
};

export type AnalyzeCreationStrategyResult = {
  guide: CreationStrategyGuide;
  posts: LinkedInActivityPostLlm[];
};

export async function fetchLinkedInActivityPosts(
  activityUrl: string,
  fetchLlm: LlmConfig,
  contentLanguage: ContentLanguage,
): Promise<LinkedInActivityPostLlm[]> {
  const normalized = normalizeLinkedInActivityUrl(activityUrl) ?? activityUrl.trim();

  const raw = await chatCompletionJson(fetchLlm, [
    {
      role: "system",
      content: buildLinkedInActivityFetchSystemPrompt(contentLanguage),
    },
    {
      role: "user",
      content: buildLinkedInActivityFetchUserPrompt(normalized),
    },
  ]);

  const parsed = parseLlmJson<LinkedInActivityFetchLlmResult>(raw);
  return normalizeLinkedInActivityPosts(parsed);
}

export async function analyzeCreationStrategy(
  input: AnalyzeCreationStrategyInput,
): Promise<AnalyzeCreationStrategyResult> {
  const normalized =
    normalizeLinkedInActivityUrl(input.activityUrl) ?? input.activityUrl.trim();

  const posts = await fetchLinkedInActivityPosts(
    normalized,
    input.fetchLlm,
    input.contentLanguage,
  );

  const raw = await chatCompletionJson(input.strategyLlm, [
    {
      role: "system",
      content: buildCreationStrategyGuideSystemPrompt(input.contentLanguage),
    },
    {
      role: "user",
      content: buildCreationStrategyGuideUserPrompt({
        contentLanguage: input.contentLanguage,
        activityUrl: normalized,
        personaExcerpt: input.personaPromptText,
        authorContext: input.authorContext,
        posts,
        userSteering: input.userSteering,
        authorSteering: input.authorSteering,
      }),
    },
  ]);

  const parsed = parseLlmJson<Record<string, unknown>>(raw);
  const guide = normalizeCreationStrategyGuide(parsed);
  if (!guide) {
    throw new Error("strategy_parse_failed");
  }

  return {
    guide: {
      ...guide,
      postsAnalyzed: posts.length > 0 ? posts.length : guide.postsAnalyzed,
    },
    posts,
  };
}
