import type { ContentLanguage } from "@/types/workspace";

export type LinkedInActivityPostLlm = {
  publishedAt?: string;
  hook?: string;
  excerpt?: string;
  format?: string;
  topics?: string[];
};

export type LinkedInActivityFetchLlmResult = {
  accessible?: boolean;
  periodStart?: string;
  periodEnd?: string;
  posts?: LinkedInActivityPostLlm[];
};

export function buildLinkedInActivityFetchSystemPrompt(
  contentLanguage: ContentLanguage,
): string {
  const langNote =
    contentLanguage === "fr"
      ? "Hooks and excerpts in French when posts are in French."
      : contentLanguage === "es"
        ? "Hooks and excerpts in Spanish when posts are in Spanish."
        : "Keep hooks in each post's original language.";

  return `You help infer a LinkedIn member's recent public posting patterns for editorial strategy (not republication).
Use the activity URL as context. If you cannot verify posts from the page, set accessible to false and posts to [] — do not invent posts.

Return JSON only:
{
  "accessible": true,
  "periodStart": "YYYY-MM-DD",
  "periodEnd": "YYYY-MM-DD",
  "posts": [
    {
      "publishedAt": "YYYY-MM-DD or approximate",
      "hook": "first line or headline of the post",
      "excerpt": "main body summary, max 400 chars",
      "format": "story | list | hot_take | case_study | announcement | other",
      "topics": ["topic1", "topic2"]
    }
  ]
}

Rules:
- Include only posts from roughly the last 60 days (2 months). If the feed shows fewer, return what exists.
- Order posts newest first. Cap at 25 posts.
- excerpt: factual summary of what the author said — no commentary.
- If the feed is private, login-only, or empty, set accessible to false and posts to [].
- ${langNote}
- Do not invent posts that are not visible on the activity page.`;
}

export function buildLinkedInActivityFetchUserPrompt(activityUrl: string): string {
  return `Activity URL (public feed if reachable):\n${activityUrl}\n\nList verifiable posts from the last ~2 months, or return accessible:false if none can be confirmed.`;
}

export function normalizeLinkedInActivityPosts(
  parsed: LinkedInActivityFetchLlmResult,
): LinkedInActivityPostLlm[] {
  if (parsed.accessible === false) return [];
  const posts = Array.isArray(parsed.posts) ? parsed.posts : [];
  return posts
    .map((p) => ({
      publishedAt: (p.publishedAt ?? "").trim() || undefined,
      hook: (p.hook ?? "").trim(),
      excerpt: (p.excerpt ?? "").trim().slice(0, 500),
      format: (p.format ?? "").trim() || undefined,
      topics: Array.isArray(p.topics)
        ? p.topics.map((t) => String(t).trim()).filter(Boolean).slice(0, 6)
        : undefined,
    }))
    .filter((p) => p.hook.length >= 8 || p.excerpt.length >= 20)
    .slice(0, 25);
}
