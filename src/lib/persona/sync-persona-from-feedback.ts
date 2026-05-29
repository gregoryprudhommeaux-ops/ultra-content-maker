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
  summarizeNewLearningEntries,
  summarizeProfileDelta,
} from "@/lib/persona/persona-changelog";
import { stripVersionHeader } from "@/lib/persona/persona-version";

function promptsEqual(a: string, b: string) {
  return a.trim() === b.trim();
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
  const base = stripLearnedSection(stripVersionHeader(persona.promptText));
  const learned = buildLearnedSectionMarkdown(
    learning,
    enrichment?.details ?? {},
    lang,
    author,
    audience,
  );
  const promptText = `${base}\n\n${learned}`;

  if (promptsEqual(promptText, persona.promptText)) return;

  const summaries: string[] = [];
  const profileSummary = summarizeProfileDelta(
    persona.profileFingerprint,
    author,
    audience,
    lang,
  );
  if (profileSummary) summaries.push(profileSummary);

  const newestEntries = (learning?.entries ?? []).slice(0, 3) as LearningEntry[];
  const learningSummary = summarizeNewLearningEntries(newestEntries, lang);
  if (learningSummary) summaries.push(learningSummary);

  const changeSummary =
    summaries.length > 0
      ? summaries.join(" ")
      : lang === "fr"
        ? "Préférences apprises et profil synchronisés dans le Persona."
        : lang === "es"
          ? "Preferencias aprendidas y perfil sincronizados en el Persona."
          : "Learned preferences and profile synced into Persona.";

  await commitPersonaPromptUpdate(userId, promptText, {
    reason: profileSummary ? "profile_sync" : "feedback_sync",
    changeSummary,
    contentLanguage: lang,
    bumpVersion: true,
    profileFingerprint: true,
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
}

export async function recordEmojiPreference(
  userId: string,
  emojiLevel: EmojiLevel,
  contentLanguage: ContentLanguage,
) {
  const labels: Record<ContentLanguage, Record<EmojiLevel, string>> = {
    fr: {
      none: "Préférence emojis: aucun",
      light: "Préférence emojis: un peu",
      heavy: "Préférence emojis: beaucoup",
    },
    en: {
      none: "Emoji preference: none",
      light: "Emoji preference: a little",
      heavy: "Emoji preference: a lot",
    },
    es: {
      none: "Preferencia emojis: ninguno",
      light: "Preferencia emojis: un poco",
      heavy: "Preferencia emojis: muchos",
    },
  };
  const { appendLearningEntries } = await import("@/lib/workspace/learning-profile");
  await appendLearningEntries(
    userId,
    [{ source: "emoji", text: labels[contentLanguage]?.[emojiLevel] ?? labels.en[emojiLevel] }],
    { emojiLevel },
  );
  await syncPersonaFromFeedback(userId);
}
