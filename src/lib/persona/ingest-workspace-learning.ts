import {
  entryFromStrategySteering,
  entryFromValidatedPost,
  entriesFromClientReview,
  hasLearningEntry,
} from "@/lib/persona/collect-learning-signals";
import { getAuthorProfile } from "@/lib/workspace/author";
import { listRecentArticles } from "@/lib/workspace/articles";
import {
  appendLearningEntries,
  getLearningProfile,
  type LearningEntry,
} from "@/lib/workspace/learning-profile";
import type { ContentLanguage } from "@/types/workspace";

/**
 * Pull feedback, validated posts, and strategy steering into the learning
 * profile so they flow into the Persona prompt (idempotent).
 */
export async function ingestWorkspaceLearningSignals(userId: string): Promise<boolean> {
  const [learning, author, articles] = await Promise.all([
    getLearningProfile(userId),
    getAuthorProfile(userId),
    listRecentArticles(userId, 40),
  ]);

  const lang = (author?.contentLanguage ?? "fr") as ContentLanguage;
  const existing = learning?.entries ?? [];
  const pending: Omit<LearningEntry, "createdAt">[] = [];

  const steeringEntry = entryFromStrategySteering(author?.creationStrategySteering, lang);
  if (steeringEntry && !hasLearningEntry(existing, steeringEntry)) {
    pending.push(steeringEntry);
  }

  for (const article of articles) {
    if (article.clientReviewFeedback) {
      for (const entry of entriesFromClientReview(
        article.clientReviewFeedback,
        article.id,
        lang,
      )) {
        if (!hasLearningEntry(existing, entry) && !hasLearningEntry(pending, entry)) {
          pending.push(entry);
        }
      }
    }

    if (article.status === "validated") {
      const validatedEntry = entryFromValidatedPost(article, lang);
      if (
        validatedEntry &&
        !hasLearningEntry(existing, validatedEntry) &&
        !hasLearningEntry(pending, validatedEntry)
      ) {
        pending.push(validatedEntry);
      }
    }
  }

  if (pending.length === 0) return false;
  await appendLearningEntries(userId, pending);
  return true;
}
