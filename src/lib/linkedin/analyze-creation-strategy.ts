import type { LlmConfig } from "@/lib/llm/config";
import { chatCompletionJson, mergeUsageLog } from "@/lib/llm/chat";
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
import { normalizeLinkedInPostsFeedUrl } from "@/lib/linkedin/activity-url";
import { resolveContentArchetype } from "@/lib/persona/content-archetype";
import type { AuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import type { ContentLanguage, CreationStrategyGuide } from "@/types/workspace";

export type AnalyzeCreationStrategyInput = {
  activityUrls: string[];
  contentLanguage: ContentLanguage;
  personaPromptText: string;
  userId?: string;
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
  userId?: string,
): Promise<LinkedInActivityPostLlm[]> {
  const normalized = normalizeLinkedInPostsFeedUrl(activityUrl) ?? activityUrl.trim();

  const raw = await chatCompletionJson(fetchLlm, [
    {
      role: "system",
      content: buildLinkedInActivityFetchSystemPrompt(contentLanguage),
    },
    {
      role: "user",
      content: buildLinkedInActivityFetchUserPrompt(normalized),
    },
  ], userId ? mergeUsageLog(userId, "linkedin/creation-strategy/fetch") : undefined);

  const parsed = parseLlmJson<LinkedInActivityFetchLlmResult>(raw);
  return normalizeLinkedInActivityPosts(parsed);
}

export async function fetchLinkedInActivityPostsFromFeeds(
  activityUrls: string[],
  fetchLlm: LlmConfig,
  contentLanguage: ContentLanguage,
  userId?: string,
): Promise<LinkedInActivityPostLlm[]> {
  const uniqueUrls = [...new Set(activityUrls.map((u) => u.trim()).filter(Boolean))];
  if (uniqueUrls.length === 0) return [];

  const batches = await Promise.all(
    uniqueUrls.map((url) =>
      fetchLinkedInActivityPosts(url, fetchLlm, contentLanguage, userId),
    ),
  );

  const seen = new Set<string>();
  const merged: LinkedInActivityPostLlm[] = [];
  for (const batch of batches) {
    for (const post of batch) {
      const key = `${post.publishedAt ?? ""}|${post.excerpt?.slice(0, 120) ?? post.hook?.slice(0, 120) ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(post);
    }
  }
  return merged;
}

export async function analyzeCreationStrategy(
  input: AnalyzeCreationStrategyInput,
): Promise<AnalyzeCreationStrategyResult> {
  const activityUrls = input.activityUrls
    .map((url) => normalizeLinkedInPostsFeedUrl(url) ?? url.trim())
    .filter(Boolean);

  const posts = await fetchLinkedInActivityPostsFromFeeds(
    activityUrls,
    input.fetchLlm,
    input.contentLanguage,
    input.userId,
  );

  const archetype = resolveContentArchetype({
    author: input.authorSteering?.author ?? null,
    profileEnrichment: input.authorSteering?.profileEnrichment ?? null,
  });

  const raw = await chatCompletionJson(input.strategyLlm, [
    {
      role: "system",
      content: buildCreationStrategyGuideSystemPrompt(input.contentLanguage, archetype),
    },
    {
      role: "user",
      content: buildCreationStrategyGuideUserPrompt({
        contentLanguage: input.contentLanguage,
        activityUrls,
        personaExcerpt: input.personaPromptText,
        authorContext: input.authorContext,
        posts,
        userSteering: input.userSteering,
        authorSteering: input.authorSteering,
      }),
    },
  ], input.userId ? mergeUsageLog(input.userId, "linkedin/creation-strategy") : undefined);

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
