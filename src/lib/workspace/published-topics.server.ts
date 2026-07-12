import {
  appendPublishedTopic,
  editorialCalendarToEnrichmentPatch,
  markCalendarEntryPublished,
  ORGANIZATION_ENRICHMENT_KEYS,
  parseEditorialCalendar,
  parsePublishedTopics,
  publishedTopicsToEnrichmentPatch,
} from "@/lib/persona/organization-enrichment";
import type { ResolvedWorkspaceScope } from "@/lib/workspace/resolve-workspace-scope.server";
import {
  headlineFromArticle,
  summaryFromArticle,
} from "@/lib/workspace/published-topics";
import {
  readWorkspaceSingletonDoc,
  workspaceScopedDocPath,
} from "@/lib/workspace/workspace-read.server";
import type { GapAnswerValue, PublishedTopicEntry } from "@/types/workspace";
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

async function markEditorialCalendarPublishedServer(
  db: Firestore,
  scope: ResolvedWorkspaceScope,
  pillarId: string | undefined,
  details: Record<string, GapAnswerValue>,
): Promise<Record<string, GapAnswerValue>> {
  const id = pillarId?.trim();
  if (!id) return details;

  const calendar = parseEditorialCalendar(details);
  const next = markCalendarEntryPublished(calendar, id);
  if (next === calendar) return details;

  const calendarPatch = editorialCalendarToEnrichmentPatch(next);
  return {
    ...details,
    [ORGANIZATION_ENRICHMENT_KEYS.editorialCalendar]:
      calendarPatch[ORGANIZATION_ENRICHMENT_KEYS.editorialCalendar],
  };
}

export async function registerPublishedTopicServer(
  db: Firestore,
  scope: ResolvedWorkspaceScope,
  entry: Omit<PublishedTopicEntry, "publishedAt"> & { publishedAt?: string },
): Promise<void> {
  const snap = await readWorkspaceSingletonDoc(db, scope, "enrichment", "profile");
  let details = (snap?.details as Record<string, GapAnswerValue> | undefined) ?? {};
  const existing = parsePublishedTopics(details);
  const full: PublishedTopicEntry = {
    ...entry,
    publishedAt: entry.publishedAt ?? new Date().toISOString(),
  };
  const next = appendPublishedTopic(existing, full);
  const patch = publishedTopicsToEnrichmentPatch(next);
  details = await markEditorialCalendarPublishedServer(db, scope, entry.pillarId, details);
  const ref = db.doc(workspaceScopedDocPath(scope, "enrichment", "profile"));
  await ref.set(
    {
      details: {
        ...details,
        [ORGANIZATION_ENRICHMENT_KEYS.publishedTopics]:
          patch[ORGANIZATION_ENRICHMENT_KEYS.publishedTopics],
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function registerPublishedTopicFromArticleServer(
  db: Firestore,
  scope: ResolvedWorkspaceScope,
  articleId: string,
  hook: string,
  body: string,
  pillarId?: string,
): Promise<void> {
  await registerPublishedTopicServer(db, scope, {
    articleId,
    headline: headlineFromArticle(hook, body),
    summary: summaryFromArticle(hook, body),
    pillarId,
  });
}
