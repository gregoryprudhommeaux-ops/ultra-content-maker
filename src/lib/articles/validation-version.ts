import {
  ARTICLE_TRANSLATION_LOCALES,
  type ArticleTranslationLocale,
} from "@/lib/articles/translation-locale";
import type {
  ArticleDoc,
  ArticleTranslations,
  ArticleTranslationVariant,
  ContentLanguage,
} from "@/types/workspace";

/** Version to push on LinkedIn at validation time. */
export type ValidationVersionId = "original" | ArticleTranslationLocale;

export function contentLanguageToSourceLocale(
  language: ContentLanguage,
): ArticleTranslationLocale {
  switch (language) {
    case "fr":
      return "fr";
    case "es":
      return "es-mx";
    case "en":
    default:
      return "en-us";
  }
}

export function translationLocaleToContentLanguage(
  locale: ArticleTranslationLocale,
): ContentLanguage {
  if (locale === "fr") return "fr";
  if (locale === "es" || locale === "es-mx") return "es";
  return "en";
}

export function listStoredTranslationLocales(
  translations?: ArticleTranslations,
): ArticleTranslationLocale[] {
  if (!translations) return [];
  return ARTICLE_TRANSLATION_LOCALES.filter((locale) => {
    const variant = translations[locale];
    return Boolean(variant?.hook?.trim() && variant?.body?.trim());
  });
}

export function articleHasStoredTranslations(
  translations?: ArticleTranslations,
): boolean {
  return listStoredTranslationLocales(translations).length > 0;
}

export type ResolvedValidationContent = {
  hook: string;
  body: string;
  ps?: string;
  hashtags?: string[];
  contentLanguage: ContentLanguage;
  isTranslation: boolean;
  locale?: ArticleTranslationLocale;
};

export function resolveArticleValidationContent(
  article: Pick<
    ArticleDoc,
    "hook" | "body" | "ps" | "hashtags" | "contentLanguage" | "translations"
  >,
  versionId: ValidationVersionId,
): ResolvedValidationContent {
  if (versionId === "original") {
    return {
      hook: article.hook,
      body: article.body,
      ps: article.ps,
      hashtags: article.hashtags,
      contentLanguage: article.contentLanguage,
      isTranslation: false,
    };
  }

  const variant = article.translations?.[versionId];
  if (!variant?.hook?.trim() || !variant?.body?.trim()) {
    return {
      hook: article.hook,
      body: article.body,
      ps: article.ps,
      hashtags: article.hashtags,
      contentLanguage: article.contentLanguage,
      isTranslation: false,
    };
  }

  return {
    hook: variant.hook,
    body: variant.body,
    ps: variant.ps,
    hashtags: variant.hashtags,
    contentLanguage: translationLocaleToContentLanguage(versionId),
    isTranslation: true,
    locale: versionId,
  };
}

/** Snapshot of the current main fields, stored under the source locale key. */
export function buildOriginalTranslationVariant(
  article: Pick<ArticleDoc, "hook" | "body" | "ps" | "hashtags">,
): ArticleTranslationVariant {
  return {
    mode: "literal",
    hook: article.hook,
    body: article.body,
    ps: article.ps,
    hashtags: article.hashtags,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Before promoting a translation to the main fields, stash the original
 * under the source locale if that slot is empty.
 */
export function withOriginalStashed(
  article: Pick<
    ArticleDoc,
    "hook" | "body" | "ps" | "hashtags" | "contentLanguage" | "translations"
  >,
): ArticleTranslations {
  const sourceLocale = contentLanguageToSourceLocale(article.contentLanguage);
  const existing = article.translations ?? {};
  if (existing[sourceLocale]?.hook?.trim() && existing[sourceLocale]?.body?.trim()) {
    return existing;
  }
  return {
    ...existing,
    [sourceLocale]: buildOriginalTranslationVariant(article),
  };
}
