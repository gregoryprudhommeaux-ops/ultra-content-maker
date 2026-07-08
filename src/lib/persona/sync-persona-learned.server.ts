import {
  entriesFromClientReview,
  hasLearningEntry,
} from "@/lib/persona/collect-learning-signals";
import {
  buildLearnedSectionMarkdown,
  stripLearnedSection,
  type LearningEntry,
  type LearningProfile,
} from "@/lib/workspace/learning-profile";
import {
  enrichmentFingerprint,
  learningEntriesFingerprint,
  profileFingerprint,
} from "@/lib/persona/persona-changelog";
import { applyVersionHeader, stripVersionHeader } from "@/lib/persona/persona-version";
import type { ResolvedWorkspaceScope } from "@/lib/workspace/resolve-workspace-scope.server";
import {
  readWorkspaceSingletonDoc,
  workspaceScopedDocPath,
} from "@/lib/workspace/workspace-read.server";
import type {
  AuthorProfile,
  AudienceProfile,
  ContentLanguage,
  CtaIntensity,
  DraftReviewFeedback,
  EmojiLevel,
  GapAnswerValue,
} from "@/types/workspace";
import { FieldValue, type Firestore } from "firebase-admin/firestore";

function parseLearningEntries(raw: unknown): LearningEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: LearningEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const text = typeof o.text === "string" ? o.text.trim() : "";
    if (!text) continue;
    out.push({
      source: (typeof o.source === "string" ? o.source : "client_review") as LearningEntry["source"],
      text,
      articleId: typeof o.articleId === "string" ? o.articleId : undefined,
      createdAt: o.createdAt instanceof Date ? o.createdAt : new Date(),
    });
  }
  return out;
}

/** Server-side: client draft review → learning profile + Persona learned section. */
export async function ingestClientReviewAndSyncPersonaServer(
  db: Firestore,
  scope: ResolvedWorkspaceScope,
  articleId: string,
  feedback: DraftReviewFeedback,
): Promise<void> {
  const learningPath = workspaceScopedDocPath(scope, "learning", "profile");
  const learningSnap = await db.doc(learningPath).get();
  const learningData = learningSnap.exists ? learningSnap.data() : {};
  const entries = parseLearningEntries(learningData?.entries);

  const authorDoc = await readWorkspaceSingletonDoc(db, scope, "author", "profile");
  const lang = (authorDoc?.contentLanguage as ContentLanguage | undefined) ?? "fr";

  const newEntries = entriesFromClientReview(feedback, articleId, lang).filter(
    (entry) => !hasLearningEntry(entries, entry),
  );
  if (newEntries.length === 0 && !learningSnap.exists) return;

  const mergedEntries: LearningEntry[] = [
    ...newEntries.map((entry) => ({
      ...entry,
      createdAt: new Date(),
    })),
    ...entries,
  ].slice(0, 40);

  await db.doc(learningPath).set(
    {
      emojiLevel: learningData?.emojiLevel ?? "light",
      preferredCtaStyle: learningData?.preferredCtaStyle ?? null,
      entries: mergedEntries.map((entry) => ({
        source: entry.source,
        text: entry.text,
        articleId: entry.articleId ?? null,
        createdAt: entry.createdAt,
      })),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const personaPath = workspaceScopedDocPath(scope, "persona", "current");
  const personaSnap = await db.doc(personaPath).get();
  if (!personaSnap.exists) return;

  const personaData = personaSnap.data() ?? {};
  const promptText = String(personaData.promptText ?? "").trim();
  if (!promptText) return;

  const [audienceDoc, enrichmentDoc] = await Promise.all([
    readWorkspaceSingletonDoc(db, scope, "audience", "profile"),
    readWorkspaceSingletonDoc(db, scope, "enrichment", "profile"),
  ]);

  const authorProfile = authorDoc
    ? ({
        roleTitle: authorDoc.roleTitle as string | undefined,
        positioningLine: authorDoc.positioningLine as string | undefined,
        contentArchetype: authorDoc.contentArchetype as AuthorProfile["contentArchetype"],
        creationStrategySteering: authorDoc.creationStrategySteering as string | undefined,
        contentLanguage: lang,
        status: "in_progress",
        updatedAt: new Date(),
      } satisfies AuthorProfile)
    : null;

  const audienceProfile: AudienceProfile | null = audienceDoc
    ? ({
        skipped: Boolean(audienceDoc.skipped),
        targetLabel: audienceDoc.targetLabel as string | undefined,
        contentFocus: audienceDoc.contentFocus as string | undefined,
        contentNiche: audienceDoc.contentNiche as string | undefined,
        newsInterestQuery: audienceDoc.newsInterestQuery as string | undefined,
        optionalNotes: audienceDoc.optionalNotes as string | undefined,
      } as AudienceProfile)
    : null;

  const enrichDetails = (enrichmentDoc?.details as Record<string, GapAnswerValue>) ?? {};

  const learningProfile: LearningProfile = {
    emojiLevel: (learningData?.emojiLevel as EmojiLevel) ?? "light",
    preferredCtaStyle: learningData?.preferredCtaStyle as CtaIntensity | undefined,
    entries: mergedEntries,
    updatedAt: new Date(),
  };

  const base = stripLearnedSection(stripVersionHeader(promptText));
  const learned = buildLearnedSectionMarkdown(
    learningProfile,
    enrichDetails,
    lang,
    authorProfile,
    audienceProfile,
  );
  const nextBody = `${base}\n\n${learned}`.trim();
  const versionNumber =
    typeof personaData.versionNumber === "number" ? personaData.versionNumber + 1 : 1;
  const updatedAt = new Date();
  const nextPrompt = applyVersionHeader(nextBody, versionNumber, updatedAt, lang);

  if (nextPrompt.trim() === promptText.trim()) return;

  await db.doc(personaPath).set(
    {
      promptText: nextPrompt,
      versionNumber,
      learningSyncHash: learningEntriesFingerprint(mergedEntries),
      enrichmentFingerprint: enrichmentFingerprint(enrichDetails),
      profileFingerprint: profileFingerprint(authorProfile, audienceProfile),
      updatedAt: FieldValue.serverTimestamp(),
      recentChanges: [
        {
          summary:
            lang === "fr"
              ? "Relecture client intégrée au Persona."
              : lang === "es"
                ? "Revisión del cliente integrada en el Persona."
                : "Client review merged into Persona.",
          source: "feedback_sync",
          at: updatedAt,
        },
        ...((personaData.recentChanges as unknown[]) ?? []).slice(0, 7),
      ],
    },
    { merge: true },
  );
}
