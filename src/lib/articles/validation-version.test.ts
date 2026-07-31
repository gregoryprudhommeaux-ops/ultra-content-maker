import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  articleHasStoredTranslations,
  contentLanguageToSourceLocale,
  listStoredTranslationLocales,
  resolveArticleValidationContent,
  translationLocaleToContentLanguage,
  withOriginalStashed,
} from "./validation-version";
import type { ArticleDoc } from "@/types/workspace";

function baseArticle(
  overrides: Partial<ArticleDoc> = {},
): Pick<
  ArticleDoc,
  "hook" | "body" | "ps" | "hashtags" | "contentLanguage" | "translations"
> {
  return {
    hook: "Accroche FR",
    body: "Corps FR",
    ps: "PS FR",
    hashtags: ["#fr"],
    contentLanguage: "fr",
    translations: {
      "es-mx": {
        mode: "localized",
        hook: "Gancho MX",
        body: "Cuerpo MX",
        ps: "PS MX",
        hashtags: ["#mx"],
        generatedAt: "2026-07-31T00:00:00.000Z",
      },
    },
    ...overrides,
  };
}

describe("validation-version", () => {
  it("maps content language ↔ translation locale", () => {
    assert.equal(contentLanguageToSourceLocale("fr"), "fr");
    assert.equal(contentLanguageToSourceLocale("es"), "es-mx");
    assert.equal(contentLanguageToSourceLocale("en"), "en-us");
    assert.equal(translationLocaleToContentLanguage("es-mx"), "es");
    assert.equal(translationLocaleToContentLanguage("en-gb"), "en");
  });

  it("lists stored translation locales with content", () => {
    assert.deepEqual(listStoredTranslationLocales(undefined), []);
    assert.deepEqual(listStoredTranslationLocales(baseArticle().translations), [
      "es-mx",
    ]);
    assert.equal(articleHasStoredTranslations(baseArticle().translations), true);
  });

  it("resolves original and translated validation content", () => {
    const article = baseArticle();
    const original = resolveArticleValidationContent(article, "original");
    assert.equal(original.hook, "Accroche FR");
    assert.equal(original.contentLanguage, "fr");
    assert.equal(original.isTranslation, false);

    const translated = resolveArticleValidationContent(article, "es-mx");
    assert.equal(translated.hook, "Gancho MX");
    assert.equal(translated.contentLanguage, "es");
    assert.equal(translated.isTranslation, true);
    assert.equal(translated.locale, "es-mx");
  });

  it("stashes original under source locale when missing", () => {
    const next = withOriginalStashed(baseArticle());
    assert.equal(next.fr?.hook, "Accroche FR");
    assert.equal(next["es-mx"]?.hook, "Gancho MX");
  });

  it("does not overwrite an existing source-locale variant", () => {
    const article = baseArticle({
      translations: {
        fr: {
          mode: "literal",
          hook: "Déjà stocké",
          body: "Corps stocké",
          generatedAt: "2026-01-01T00:00:00.000Z",
        },
        "es-mx": {
          mode: "localized",
          hook: "Gancho MX",
          body: "Cuerpo MX",
          generatedAt: "2026-07-31T00:00:00.000Z",
        },
      },
    });
    const next = withOriginalStashed(article);
    assert.equal(next.fr?.hook, "Déjà stocké");
  });
});
