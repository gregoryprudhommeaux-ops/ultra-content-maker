"use client";

import { UserErrorBanner } from "@/components/ui/user-error-banner";
import { useAuth } from "@/components/auth/auth-provider";
import { useFormatUserError } from "@/hooks/use-format-user-error";
import {
  ARTICLE_TRANSLATION_LOCALES,
  defaultTranslationLocale,
  isTranslationLocaleDisabled,
  type ArticleTranslationLocale,
} from "@/lib/articles/translation-locale";
import type { UserErrorInfo } from "@/lib/errors/format-user-error";
import { getClientAuth } from "@/lib/firebase/client";
import { joinLinkedInPostParts } from "@/lib/linkedin/fit-linkedin-post";
import { gatherAuthorSteeringPayload } from "@/lib/profile/gather-author-steering";
import { getPersona } from "@/lib/workspace/persona";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import { saveArticleTranslation } from "@/lib/workspace/articles";
import type {
  ArticleDoc,
  ArticleTranslationMode,
  ArticleTranslationVariant,
} from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

type Props = {
  article: ArticleDoc;
  onUpdated: (patch: Partial<ArticleDoc>) => void;
};

function localeButtonClass(selected: boolean): string {
  return [
    "rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors",
    selected
      ? "border-ns-primary bg-ns-primary/15 text-ns-tertiary"
      : "border-gray-200 bg-white text-ns-tertiary hover:border-ns-primary/50",
  ].join(" ");
}

function modeButtonClass(selected: boolean): string {
  return [
    "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
    selected
      ? "border-ns-primary bg-ns-primary/15 text-ns-tertiary"
      : "border-gray-200 bg-white text-ns-tertiary hover:border-ns-primary/50",
  ].join(" ");
}

export function ArticleTranslationPanel({ article, onUpdated }: Props) {
  const t = useTranslations("setup.articles.translate");
  const formatError = useFormatUserError();
  const { user } = useAuth();
  const sourceLang = article.contentLanguage;

  const [targetLocale, setTargetLocale] = useState<ArticleTranslationLocale>(() =>
    defaultTranslationLocale(sourceLang),
  );
  const [mode, setMode] = useState<ArticleTranslationMode>("localized");
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<UserErrorInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const existing = article.translations?.[targetLocale];

  const localeOptions = useMemo(
    () =>
      ARTICLE_TRANSLATION_LOCALES.map((locale) => ({
        locale,
        disabled: isTranslationLocaleDisabled(sourceLang, locale),
      })),
    [sourceLang],
  );

  const runTranslation = useCallback(async () => {
    if (!user) return;
    if (isTranslationLocaleDisabled(sourceLang, targetLocale)) return;

    setErrorInfo(null);
    setLoading(true);

    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const [llmProfile, persona, authorSteering] = await Promise.all([
        getUserLlmProfile(user.uid),
        getPersona(user.uid),
        gatherAuthorSteeringPayload(user.uid),
      ]);
      if (!token || !llmProfile?.apiKey) {
        setErrorInfo(
          formatError({ errorCode: "no_llm_key", fallbackMessage: t("noLlm") }),
        );
        return;
      }
      const personaText = persona?.promptText?.trim() ?? "";
      if (!personaText) {
        setErrorInfo({ message: t("noPersona") });
        return;
      }

      const res = await fetch("/api/articles/translate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceLanguage: sourceLang,
          targetLocale,
          mode,
          personaPromptText: personaText,
          hook: article.hook,
          body: article.body,
          ps: article.ps,
          hashtags: article.hashtags,
          postBrief: article.postBrief,
          authorSteering,
          llm: {
            provider: llmProfile.provider,
            apiKey: llmProfile.apiKey,
            model: llmProfile.model,
          },
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        detail?: string;
        translation?: ArticleTranslationVariant;
      };

      if (!res.ok || !data.translation) {
        setErrorInfo(
          formatError({
            errorCode: data.error ?? "llm_request_failed",
            detail: data.detail,
            fallbackMessage: t("failed"),
          }),
        );
        return;
      }

      const translations = await saveArticleTranslation(
        user.uid,
        article.id,
        targetLocale,
        data.translation,
        article.translations,
      );
      onUpdated({ translations });
    } catch {
      setErrorInfo(
        formatError({ errorCode: "llm_request_failed", fallbackMessage: t("failed") }),
      );
    } finally {
      setLoading(false);
    }
  }, [
    article,
    formatError,
    mode,
    onUpdated,
    sourceLang,
    t,
    targetLocale,
    user,
  ]);

  async function copyVariant(variant: ArticleTranslationVariant) {
    const text =
      variant.exportText?.trim() ||
      joinLinkedInPostParts({
        hook: variant.hook,
        body: variant.body,
        ps: variant.ps,
      });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-5 border-t border-gray-100 pt-5">
      <div>
        <h3 className="text-sm font-semibold text-ns-tertiary">{t("title")}</h3>
        <p className="mt-1 text-xs text-ns-secondary">{t("subtitle")}</p>
      </div>

      {errorInfo && (
        <UserErrorBanner
          surface="article-translation"
          userMessage={errorInfo.message}
          hint={errorInfo.hint}
          technical={errorInfo.technical}
          errorCode={errorInfo.errorCode}
          detail={errorInfo.detail}
        />
      )}

      <div className="space-y-4 rounded-xl border border-gray-100 bg-ns-brand-light/30 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ns-secondary">
            {t("targetLanguageLabel")}
          </p>
          <div
            className="mt-2 grid gap-2 sm:grid-cols-2"
            role="radiogroup"
            aria-label={t("targetLanguageLabel")}
          >
            {localeOptions.map(({ locale, disabled }) => (
              <button
                key={locale}
                type="button"
                role="radio"
                aria-checked={targetLocale === locale}
                disabled={disabled || loading}
                onClick={() => setTargetLocale(locale)}
                className={[
                  localeButtonClass(targetLocale === locale),
                  disabled ? "cursor-not-allowed opacity-40" : "",
                ].join(" ")}
              >
                {t(`locales.${locale}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ns-secondary">
            {t("styleLabel")}
          </p>
          <div
            className="mt-2 flex flex-wrap gap-2"
            role="radiogroup"
            aria-label={t("styleLabel")}
          >
            <button
              type="button"
              role="radio"
              aria-checked={mode === "literal"}
              disabled={loading}
              onClick={() => setMode("literal")}
              className={modeButtonClass(mode === "literal")}
            >
              {t("literal")}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "localized"}
              disabled={loading}
              onClick={() => setMode("localized")}
              className={modeButtonClass(mode === "localized")}
            >
              {t("localized")}
            </button>
          </div>
          <p className="mt-2 text-xs text-ns-secondary">
            {mode === "literal" ? t("literalHint") : t("localizedHint")}
          </p>
        </div>

        <button
          type="button"
          disabled={
            loading || isTranslationLocaleDisabled(sourceLang, targetLocale)
          }
          onClick={() => void runTranslation()}
          className="rounded-lg bg-ns-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-black shadow-sm hover:bg-ns-primary/90 disabled:opacity-50"
        >
          {loading ? "…" : existing ? t("regenerate") : t("generate")}
        </button>
      </div>

      {existing && (
        <div className="space-y-2 rounded-lg border border-gray-100 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ns-secondary">
            {t(`locales.${targetLocale}`)} ·{" "}
            {existing.mode === "literal" ? t("literal") : t("localized")} ·{" "}
            {new Date(existing.generatedAt).toLocaleString()}
          </p>
          <p className="text-sm font-semibold text-ns-tertiary line-clamp-2">
            {existing.hook}
          </p>
          <p className="text-xs text-ns-secondary line-clamp-4 whitespace-pre-wrap">
            {existing.body}
          </p>
          <button
            type="button"
            onClick={() => void copyVariant(existing)}
            className="text-xs font-semibold text-ns-primary underline"
          >
            {copied ? t("copied") : t("copy")}
          </button>
        </div>
      )}
    </div>
  );
}
