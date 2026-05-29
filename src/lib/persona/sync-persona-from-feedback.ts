import { getAuthorProfile } from "@/lib/workspace/author";
import { getAudienceProfile } from "@/lib/workspace/audience";
import { getProfileEnrichment } from "@/lib/workspace/enrichment";
import {
  buildLearnedSectionMarkdown,
  getLearningProfile,
  replaceArticleRefinementLearning,
  stripLearnedSection,
  type LearningEntry,
} from "@/lib/workspace/learning-profile";
import { commitPersonaPromptUpdate, getPersona } from "@/lib/workspace/persona";
import type {
  ArticleRefinement,
  ContentLanguage,
  CtaIntensity,
  EmojiLevel,
  GapAnswerValue,
  ProfileGapQuestion,
} from "@/types/workspace";
import {
  entriesFromGapAnswers,
  entriesFromRefinement,
  entryFromCtaChoice,
} from "@/lib/workspace/learning-profile";
import {
  buildSyncChangeSummary,
  enrichmentFingerprint,
  learningEntriesFingerprint,
  summarizeEnrichmentDelta,
  summarizeLearningDelta,
  summarizeProfileDeltaDetailed,
} from "@/lib/persona/persona-changelog";
import { stripVersionHeader } from "@/lib/persona/persona-version";
import { refreshPersonaFromProfile } from "@/lib/persona/refresh-persona-from-profile";

function promptsEqual(a: string, b: string) {
  return a.trim() === b.trim();
}

function buildRefinementComment(refinement: ArticleRefinement): string | undefined {
  const parts: string[] = [];
  if (refinement.globalComment?.trim()) {
    parts.push(refinement.globalComment.trim());
  }
  for (const q of refinement.questions) {
    if (q.comment?.trim()) {
      parts.push(q.comment.trim());
    }
  }
  if (parts.length === 0) return undefined;
  return parts.join("\n");
}

/** Persist feedback signals and merge them into the Persona prompt. */
export async function syncPersonaFromFeedback(userId: string) {
  const [persona, enrichment, author, audience, learning] = await Promise.all([
    getPersona(userId),
    getProfileEnrichment(userId),
    getAuthorProfile(userId),
    getAudienceProfile(userId),
    getLearningProfile(userId),
  ]);

  if (!persona?.promptText) return;

  const lang = (author?.contentLanguage ?? "fr") as ContentLanguage;
  const entries = (learning?.entries ?? []) as LearningEntry[];
  const enrichDetails = enrichment?.details ?? {};

  const base = stripLearnedSection(stripVersionHeader(persona.promptText));
  const learned = buildLearnedSectionMarkdown(
    learning,
    enrichDetails,
    lang,
    author,
    audience,
  );
  const promptText = `${base}\n\n${learned}`;

  const profileLines = summarizeProfileDeltaDetailed(
    persona.profileFingerprint,
    author,
    audience,
    lang,
  );
  const learningLines = summarizeLearningDelta(
    persona.learningSyncHash,
    entries,
    lang,
  );
  const enrichmentLines = summarizeEnrichmentDelta(
    persona.enrichmentFingerprint,
    enrichDetails,
    lang,
  );

  const changeSummary = buildSyncChangeSummary([
    ...profileLines,
    ...learningLines,
    ...enrichmentLines,
  ]);

  const promptUnchanged = promptsEqual(promptText, persona.promptText);
  if (promptUnchanged && !changeSummary) return;

  const newLearningHash = learningEntriesFingerprint(entries);
  const newEnrichmentHash = enrichmentFingerprint(enrichDetails);

  const reason =
    profileLines.length > 0 || enrichmentLines.length > 0
      ? "profile_sync"
      : "feedback_sync";

  await commitPersonaPromptUpdate(userId, promptText, {
    reason,
    changeSummary:
      changeSummary ??
      (lang === "fr"
        ? "Préférences et profil synchronisés dans le Persona."
        : lang === "es"
          ? "Preferencias y perfil sincronizados en el Persona."
          : "Preferences and profile synced into Persona."),
    contentLanguage: lang,
    bumpVersion: !promptUnchanged || !!changeSummary,
    profileFingerprint: true,
    learningSyncHash: newLearningHash,
    enrichmentFingerprint: newEnrichmentHash,
  });
}

export async function recordGapFeedback(
  userId: string,
  questions: ProfileGapQuestion[],
  answers: Record<string, GapAnswerValue>,
) {
  const { applyGapAnswers } = await import("@/lib/persona/gap-questions");
  await applyGapAnswers(userId, questions, answers);
  const entries = entriesFromGapAnswers(questions, answers);
  if (entries.length > 0) {
    const { appendLearningEntries } = await import("@/lib/workspace/learning-profile");
    await appendLearningEntries(userId, entries);
  }
  await syncPersonaFromFeedback(userId);
  await tryRefreshPersonaBaseFromProfile(userId);
}

export async function recordArticleRefinementFeedback(
  userId: string,
  articleId: string,
  refinement: ArticleRefinement,
  contentLanguage: ContentLanguage,
) {
  await replaceArticleRefinementLearning(
    userId,
    articleId,
    refinement,
    contentLanguage,
  );
  await syncPersonaFromFeedback(userId);

  const comment = buildRefinementComment(refinement);
  if (comment && comment.length >= 40) {
    await tryRefreshPersonaBaseFromProfile(userId, contentLanguage, comment);
  }
}

/** Persist refinement to Firestore and merge into Persona (debounced field edits). */
export async function persistArticleRefinementAndSyncPersona(
  userId: string,
  articleId: string,
  refinement: ArticleRefinement,
  contentLanguage: ContentLanguage,
  articleStatus: "draft" | "refining",
) {
  const { saveArticleRefinement } = await import("@/lib/workspace/articles");
  await saveArticleRefinement(userId, articleId, refinement, articleStatus);
  await recordArticleRefinementFeedback(
    userId,
    articleId,
    refinement,
    contentLanguage,
  );
}

export async function recordArticleValidateFeedback(
  userId: string,
  articleId: string,
  refinement: ArticleRefinement | undefined,
  contentLanguage: ContentLanguage,
  ctaStyle: CtaIntensity,
) {
  if (refinement) {
    await replaceArticleRefinementLearning(
      userId,
      articleId,
      refinement,
      contentLanguage,
    );
  }
  const { appendLearningEntries } = await import("@/lib/workspace/learning-profile");
  await appendLearningEntries(
    userId,
    [entryFromCtaChoice(ctaStyle, contentLanguage)],
    {
      emojiLevel: refinement?.emojiLevel,
      preferredCtaStyle: ctaStyle,
    },
  );
  await syncPersonaFromFeedback(userId);
  if (refinement) {
    const comment = buildRefinementComment(refinement);
    if (comment) {
      await tryRefreshPersonaBaseFromProfile(userId, contentLanguage, comment);
    }
  }
}

export async function recordEmojiPreference(
  userId: string,
  emojiLevel: EmojiLevel,
  contentLanguage: ContentLanguage,
) {
  const { saveDefaultEmojiLevel } = await import("@/lib/workspace/learning-profile");
  await saveDefaultEmojiLevel(userId, emojiLevel, contentLanguage);
  await syncPersonaFromFeedback(userId);
}

async function tryRefreshPersonaBaseFromProfile(
  userId: string,
  contentLanguage?: ContentLanguage,
  userComment?: string,
) {
  try {
    const author = await getAuthorProfile(userId);
    const lang = (contentLanguage ?? author?.contentLanguage ?? "fr") as ContentLanguage;
    await refreshPersonaFromProfile(userId, lang, userComment);
  } catch {
    /* no persona or no API key */
  }
}
