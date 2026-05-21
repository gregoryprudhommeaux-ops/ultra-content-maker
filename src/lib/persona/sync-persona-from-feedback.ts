import { getAuthorProfile } from "@/lib/workspace/author";
import { getProfileEnrichment } from "@/lib/workspace/enrichment";
import {
  appendLearningEntries,
  buildLearnedSectionMarkdown,
  getLearningProfile,
  stripLearnedSection,
  type LearningEntry,
} from "@/lib/workspace/learning-profile";
import { getPersona, updatePersonaPromptText } from "@/lib/workspace/persona";
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

/** Persist feedback signals and merge them into the Persona prompt. */
export async function syncPersonaFromFeedback(userId: string) {
  const [persona, enrichment, author, learning] = await Promise.all([
    getPersona(userId),
    getProfileEnrichment(userId),
    getAuthorProfile(userId),
    getLearningProfile(userId),
  ]);

  if (!persona?.promptText) return;

  const lang = (author?.contentLanguage ?? "fr") as ContentLanguage;
  const base = stripLearnedSection(persona.promptText);
  const learned = buildLearnedSectionMarkdown(
    learning,
    enrichment?.details ?? {},
    lang,
  );
  const promptText = `${base}\n\n${learned}`;

  await updatePersonaPromptText(userId, promptText);
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
    await appendLearningEntries(userId, entries);
  }
  await syncPersonaFromFeedback(userId);
}

export async function recordArticleRefinementFeedback(
  userId: string,
  refinement: ArticleRefinement,
  contentLanguage: ContentLanguage,
) {
  const entries = entriesFromRefinement(refinement, contentLanguage);
  if (entries.length === 0) return;
  await appendLearningEntries(userId, entries, {
    emojiLevel: refinement.emojiLevel,
  });
  await syncPersonaFromFeedback(userId);
}

export async function recordArticleValidateFeedback(
  userId: string,
  refinement: ArticleRefinement | undefined,
  contentLanguage: ContentLanguage,
  ctaStyle: CtaIntensity,
) {
  const entries: Omit<LearningEntry, "createdAt">[] = [
    entryFromCtaChoice(ctaStyle, contentLanguage),
  ];
  if (refinement) {
    entries.push(...entriesFromRefinement(refinement, contentLanguage));
  }
  await appendLearningEntries(userId, entries, {
    emojiLevel: refinement?.emojiLevel,
    preferredCtaStyle: ctaStyle,
  });
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
  await appendLearningEntries(
    userId,
    [{ source: "emoji", text: labels[contentLanguage]?.[emojiLevel] ?? labels.en[emojiLevel] }],
    { emojiLevel },
  );
  await syncPersonaFromFeedback(userId);
}
