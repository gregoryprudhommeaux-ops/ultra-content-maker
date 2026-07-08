import type { LearningEntry } from "@/lib/workspace/learning-profile";
import type {
  ArticleDoc,
  ContentLanguage,
  DraftReviewFeedback,
} from "@/types/workspace";

const CLIENT_REVIEW_LABELS: Record<ContentLanguage, string> = {
  fr: "Relecture client",
  en: "Client review",
  es: "Revisión cliente",
};

const STRATEGY_LABELS: Record<ContentLanguage, string> = {
  fr: "Pilotage éditorial",
  en: "Editorial steering",
  es: "Dirección editorial",
};

const VALIDATED_LABELS: Record<ContentLanguage, string> = {
  fr: "Post validé (référence)",
  en: "Validated post (reference)",
  es: "Post validado (referencia)",
};

function langOrDefault(lang?: ContentLanguage): ContentLanguage {
  return lang === "fr" || lang === "es" || lang === "en" ? lang : "fr";
}

/** Client draft-review answers → durable learning lines. */
export function entriesFromClientReview(
  feedback: DraftReviewFeedback,
  articleId: string,
  lang: ContentLanguage = "fr",
): Omit<LearningEntry, "createdAt">[] {
  const label = CLIENT_REVIEW_LABELS[langOrDefault(lang)];
  const lines = Object.entries(feedback.answers)
    .map(([key, value]) => {
      const text = value.trim();
      if (!text) return null;
      return `${label} · ${key}: ${text}`;
    })
    .filter((line): line is string => Boolean(line));

  if (lines.length === 0) return [];

  return lines.map((text) => ({
    source: "client_review" as const,
    text,
    articleId,
  }));
}

export function entryFromStrategySteering(
  steering: string | undefined | null,
  lang: ContentLanguage = "fr",
): Omit<LearningEntry, "createdAt"> | null {
  const text = steering?.trim().slice(0, 1500);
  if (!text) return null;
  const label = STRATEGY_LABELS[langOrDefault(lang)];
  return {
    source: "strategy_steering",
    text: `${label}: ${text}`,
  };
}

export function entryFromValidatedPost(
  article: Pick<ArticleDoc, "id" | "hook" | "body">,
  lang: ContentLanguage = "fr",
): Omit<LearningEntry, "createdAt"> | null {
  const hook = article.hook?.trim();
  if (!hook) return null;
  const label = VALIDATED_LABELS[langOrDefault(lang)];
  const excerpt = hook.length > 160 ? `${hook.slice(0, 157)}…` : hook;
  return {
    source: "validated_post",
    text: `${label}: ${excerpt}`,
    articleId: article.id,
  };
}

export function learningEntryKey(entry: Pick<LearningEntry, "source" | "text" | "articleId">): string {
  return `${entry.source}:${entry.articleId ?? ""}:${entry.text.trim().toLowerCase()}`;
}

export function hasLearningEntry(
  entries: Array<Pick<LearningEntry, "source" | "text" | "articleId">>,
  candidate: Pick<LearningEntry, "source" | "text" | "articleId">,
): boolean {
  const key = learningEntryKey(candidate);
  return entries.some((entry) => learningEntryKey(entry) === key);
}
