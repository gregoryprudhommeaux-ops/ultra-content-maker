"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import { isInvalidApiKeyError } from "@/lib/llm/parse-json";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { getAuthorProfile } from "@/lib/workspace/author";
import { isValidUrl } from "@/lib/workspace/firestore-utils";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import { INPUT_CLASS, LABEL_CLASS, type ContentLanguage } from "@/types/workspace";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

const MIN_EXCERPT = 40;

type Props = {
  url: string;
  excerpt: string;
  contentLanguage?: ContentLanguage;
  onUrlChange: (url: string) => void;
  onExcerptChange: (excerpt: string) => void;
  onContinue: () => void;
};

export function InspirationUrlStep({
  url,
  excerpt,
  contentLanguage: contentLanguageProp,
  onUrlChange,
  onExcerptChange,
  onContinue,
}: Props) {
  const t = useTranslations("setup.articles.create.inspiration");
  const tArticles = useTranslations("setup.articles");
  const locale = useLocale() as ContentLanguage;
  const { user } = useAuth();

  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchedTitle, setFetchedTitle] = useState<string | null>(null);

  const urlOk = isValidUrl(url);
  const excerptOk = excerpt.trim().length >= MIN_EXCERPT;

  async function onFetchContent() {
    if (!user || !urlOk) return;
    setFetching(true);
    setFetchError(null);
    setFetchedTitle(null);

    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const llmProfile = await getUserLlmProfile(user.uid);
      if (!token || !llmProfile?.apiKey) {
        setFetchError(tArticles("noLlmKey"));
        return;
      }

      const author = await getAuthorProfile(user.uid);
      const lang = contentLanguageProp ?? author?.contentLanguage ?? locale;

      const res = await fetch("/api/inspiration/fetch-url", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url.trim(),
          contentLanguage: lang,
          llm: {
            provider: llmProfile.provider,
            apiKey: llmProfile.apiKey,
            model: llmProfile.model,
          },
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        excerpt?: string;
        title?: string;
        perplexityRecommended?: boolean;
        detail?: string;
      };

      if (!res.ok) {
        if (data.error === "no_content") {
          setFetchError(t("fetchNoContent"));
          return;
        }
        if (data.error === "url_invalid" || data.error === "url_blocked") {
          setFetchError(t("urlInvalid"));
          return;
        }
        if (data.error === "invalid_api_key" || isInvalidApiKeyError(data.detail ?? "")) {
          setFetchError(tArticles("invalidApiKey"));
          return;
        }
        setFetchError(t("fetchFailed"));
        return;
      }

      if (data.excerpt?.trim()) {
        onExcerptChange(data.excerpt.trim());
        setFetchedTitle(data.title?.trim() || null);
      } else {
        setFetchError(t("fetchNoContent"));
      }
    } catch {
      setFetchError(t("fetchFailed"));
    } finally {
      setFetching(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-gray-100 bg-white p-5">
      <div>
        <h2 className="text-base font-semibold text-ns-tertiary">{t("urlTitle")}</h2>
        <p className="mt-1 text-sm text-ns-secondary">{t("urlHint")}</p>
      </div>
      <div>
        <label className={LABEL_CLASS} htmlFor="inspiration-url">
          {t("urlLabel")}
        </label>
        <input
          id="inspiration-url"
          type="url"
          value={url}
          onChange={(e) => {
            onUrlChange(e.target.value);
            setFetchError(null);
            setFetchedTitle(null);
          }}
          placeholder={t("urlPlaceholder")}
          className={`${INPUT_CLASS} mt-1`}
        />
        {url.trim() && !urlOk && (
          <p className="mt-1 text-xs text-amber-800">{t("urlInvalid")}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!urlOk || fetching}
            onClick={() => void onFetchContent()}
            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-900 hover:bg-violet-100 disabled:opacity-50"
          >
            {fetching ? t("fetching") : t("fetchContent")}
          </button>
          {fetchedTitle && (
            <span className="text-xs text-ns-secondary">
              {t("fetchTitleLabel")}: {fetchedTitle}
            </span>
          )}
        </div>
        {fetchError && (
          <p className="mt-2 text-xs text-amber-800">{fetchError}</p>
        )}
      </div>
      <div>
        <label className={LABEL_CLASS} htmlFor="inspiration-url-excerpt">
          {t("excerptLabel")}
        </label>
        <textarea
          id="inspiration-url-excerpt"
          rows={10}
          value={excerpt}
          onChange={(e) => onExcerptChange(e.target.value)}
          placeholder={t("excerptPlaceholder")}
          className={`${INPUT_CLASS} mt-1 font-mono text-sm`}
        />
        <p className="mt-1 text-xs text-ns-secondary">{t("excerptHelp")}</p>
      </div>
      <button
        type="button"
        disabled={!urlOk || !excerptOk}
        onClick={onContinue}
        className={`${BTN_PRIMARY} disabled:opacity-50`}
      >
        {t("continueToBrief")}
      </button>
    </section>
  );
}
