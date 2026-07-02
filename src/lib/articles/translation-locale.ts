import type {
 ArticleTranslationLocale,
 ArticleTranslations,
 ContentLanguage,
} from "@/types/workspace";

export type { ArticleTranslationLocale };

export const ARTICLE_TRANSLATION_LOCALES: ArticleTranslationLocale[] = [
 "fr",
 "es-mx",
 "es",
 "en-gb",
 "en-us",
];

const LEGACY_TRANSLATION_KEY_MAP: Record<string, ArticleTranslationLocale> = {
 fr: "fr",
 en: "en-us",
 es: "es-mx",
};

export const TRANSLATION_LOCALE_LABELS: Record<ArticleTranslationLocale, string> = {
 fr: "French (France)",
 "es-mx": "Spanish (Mexico · professional B2B)",
 es: "Spanish (Spain / international · neutral professional)",
 "en-gb": "English (UK · British spelling and references)",
 "en-us": "English (US · American spelling and references)",
};

export const TRANSLATION_LOCALE_AUDIENCE: Record<ArticleTranslationLocale, string> = {
 fr: "French-speaking professionals in France and the EU.",
 "es-mx":
 "Spanish-speaking professionals in Mexico and LATAM · localize examples and tone for Mexico.",
 es: "Spanish-speaking professionals in Spain and Europe · use neutral or Spain-appropriate references (vosotros only if natural for the persona).",
 "en-gb":
 "English-speaking professionals in the UK · British spelling, idioms, and market references.",
 "en-us":
 "English-speaking professionals in the United States · American spelling, idioms, and market references.",
};

/** Cannot translate into the same locale as the article's primary language. */
export function isTranslationLocaleDisabled(
 sourceLanguage: ContentLanguage,
 locale: ArticleTranslationLocale,
): boolean {
 if (sourceLanguage === "fr" && locale === "fr") return true;
 return false;
}

export function defaultTranslationLocale(
 sourceLanguage: ContentLanguage,
): ArticleTranslationLocale {
 const first = ARTICLE_TRANSLATION_LOCALES.find(
 (l) => !isTranslationLocaleDisabled(sourceLanguage, l),
 );
 return first ?? "en-us";
}

/** Normalize Firestore keys from legacy `en` / `es` / `fr` to regional locales. */
export function normalizeArticleTranslations(
 raw: ArticleTranslations | Record<string, unknown> | undefined,
): ArticleTranslations | undefined {
 if (!raw || typeof raw !== "object") return undefined;

 const out: ArticleTranslations = {};
 for (const [key, value] of Object.entries(raw)) {
 if (!value || typeof value !== "object") continue;
 const locale =
 (LEGACY_TRANSLATION_KEY_MAP[key] as ArticleTranslationLocale | undefined) ??
 (ARTICLE_TRANSLATION_LOCALES.includes(key as ArticleTranslationLocale)
 ? (key as ArticleTranslationLocale)
 : null);
 if (!locale) continue;
 out[locale] = value as ArticleTranslations[ArticleTranslationLocale];
 }
 return Object.keys(out).length > 0 ? out : undefined;
}
