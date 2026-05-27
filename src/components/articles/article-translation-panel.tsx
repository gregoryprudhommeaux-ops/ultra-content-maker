"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import { joinLinkedInPostParts } from "@/lib/linkedin/fit-linkedin-post";
import { getPersona } from "@/lib/workspace/persona";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import { saveArticleTranslation } from "@/lib/workspace/articles";
import type {
  ArticleDoc,
  ArticleTranslationMode,
  ArticleTranslationVariant,
  ContentLanguage,
} from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

const ALL_LANGS: ContentLanguage[] = ["fr", "en", "es"];

type Props = {
  article: ArticleDoc;
  onUpdated: (patch: Partial<ArticleDoc>) => void;
};

export function ArticleTranslationPanel({ article, onUpdated }: Props) {
  const t = useTranslations("setup.articles.translate");
  const { user } = useAuth();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const sourceLang = article.contentLanguage;
  const targetLangs = ALL_LANGS.filter((l) => l !== sourceLang);

  const runTranslation = useCallback(
    async (targetLanguage: ContentLanguage, mode: ArticleTranslationMode) => {
      if (!user) return;
      setError(null);
      const loadKey = `${targetLanguage}-${mode}`;
      setLoadingKey(loadKey);

      try {
        const auth = getClientAuth();
        const token = auth ? await auth.currentUser?.getIdToken() : null;
        const [llmProfile, persona] = await Promise.all([
          getUserLlmProfile(user.uid),
          getPersona(user.uid),
        ]);
        if (!token || !llmProfile?.apiKey) {
          setError(t("noLlm"));
          return;
        }
        const personaText = persona?.promptText?.trim() ?? "";
        if (!personaText) {
          setError(t("noPersona"));
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
            targetLanguage,
            mode,
            personaPromptText: personaText,
            hook: article.hook,
            body: article.body,
            ps: article.ps,
            hashtags: article.hashtags,
            postBrief: article.postBrief,
            llm: {
              provider: llmProfile.provider,
              apiKey: llmProfile.apiKey,
              model: llmProfile.model,
            },
          }),
        });

        const data = (await res.json()) as {
          error?: string;
          translation?: ArticleTranslationVariant;
        };

        if (!res.ok || !data.translation) {
          setError(t("failed"));
          return;
        }

        const translations = await saveArticleTranslation(
          user.uid,
          article.id,
          targetLanguage,
          data.translation,
          article.translations,
        );
        onUpdated({ translations });
      } catch {
        setError(t("failed"));
      } finally {
        setLoadingKey(null);
      }
    },
    [article, onUpdated, sourceLang, t, user],
  );

  async function copyVariant(
    key: string,
    variant: ArticleTranslationVariant,
  ) {
    const text =
      variant.exportText?.trim() ||
      joinLinkedInPostParts({
        hook: variant.hook,
        body: variant.body,
        ps: variant.ps,
      });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-4 border-t border-gray-100 pt-5">
      <div>
        <h3 className="text-sm font-semibold text-ns-tertiary">{t("title")}</h3>
        <p className="mt-1 text-xs text-ns-secondary">{t("subtitle")}</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-6">
        {targetLangs.map((lang) => {
          const existing = article.translations?.[lang];
          return (
            <div
              key={lang}
              className="rounded-xl border border-gray-100 bg-ns-brand-light/30 p-4"
            >
              <p className="text-sm font-bold uppercase tracking-wide text-ns-tertiary">
                {t(`languages.${lang}`)}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loadingKey !== null}
                  onClick={() => void runTranslation(lang, "literal")}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-ns-tertiary hover:border-ns-primary/50 disabled:opacity-50"
                >
                  {loadingKey === `${lang}-literal` ? "…" : t("literal")}
                </button>
                <button
                  type="button"
                  disabled={loadingKey !== null}
                  onClick={() => void runTranslation(lang, "localized")}
                  className="rounded-lg border border-ns-primary/30 bg-ns-primary/10 px-3 py-2 text-xs font-semibold text-ns-tertiary hover:bg-ns-primary/20 disabled:opacity-50"
                >
                  {loadingKey === `${lang}-localized` ? "…" : t("localized")}
                </button>
              </div>
              <p className="mt-2 text-xs text-ns-secondary">{t("literalHint")}</p>
              <p className="text-xs text-ns-secondary">{t("localizedHint")}</p>

              {existing && (
                <div className="mt-4 space-y-2 rounded-lg border border-gray-100 bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-ns-secondary">
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
                    onClick={() => void copyVariant(lang, existing)}
                    className="text-xs font-semibold text-ns-primary underline"
                  >
                    {copiedKey === lang ? t("copied") : t("copy")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
