import {
  appendPublishedTopic,
  parsePublishedTopics,
  publishedTopicsToEnrichmentPatch,
} from "@/lib/persona/organization-enrichment";
import { getProfileEnrichment, saveProfileEnrichment } from "@/lib/workspace/enrichment";
import type { PublishedTopicEntry } from "@/types/workspace";

export function headlineFromArticle(hook: string, body: string): string {
  const hookLine = hook.trim().split(/\n/)[0]?.trim() ?? "";
  if (hookLine.length >= 12) return hookLine.slice(0, 160);
  const bodyLine = body.trim().split(/\n/)[0]?.trim() ?? "";
  return (bodyLine || hookLine || "Post validé").slice(0, 160);
}

export function summaryFromArticle(hook: string, body: string): string {
  const combined = `${hook.trim()}\n${body.trim()}`.replace(/\s+/g, " ").trim();
  return combined.slice(0, 240);
}

export async function registerPublishedTopic(
  userId: string,
  entry: Omit<PublishedTopicEntry, "publishedAt"> & { publishedAt?: string },
): Promise<void> {
  const enrichment = await getProfileEnrichment(userId);
  const existing = parsePublishedTopics(enrichment?.details);
  const full: PublishedTopicEntry = {
    ...entry,
    publishedAt: entry.publishedAt ?? new Date().toISOString(),
  };
  const next = appendPublishedTopic(existing, full);
  await saveProfileEnrichment(userId, publishedTopicsToEnrichmentPatch(next));
}

export async function registerPublishedTopicFromArticle(
  userId: string,
  articleId: string,
  hook: string,
  body: string,
  pillarId?: string,
): Promise<void> {
  await registerPublishedTopic(userId, {
    articleId,
    headline: headlineFromArticle(hook, body),
    summary: summaryFromArticle(hook, body),
    pillarId,
  });
}
