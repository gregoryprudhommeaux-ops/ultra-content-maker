"use client";

import {
  countScopes,
  resolveArticleScope,
  SCOPE_CARD_CLASS,
} from "@/lib/articles/scope";
import { ArticlesHubHeader } from "@/components/articles/articles-hub-header";
import {
  NewsPickerPanel,
  newsToSource,
} from "@/components/articles/news-picker-panel";
import { OnboardingBlockedBanner } from "@/components/onboarding/onboarding-blocked-banner";
import { notifyOnboardingProgressChanged } from "@/contexts/onboarding-progress-context";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { useAuth } from "@/components/auth/auth-provider";
import { getAudienceProfile } from "@/lib/workspace/audience";
import { getAuthorProfile } from "@/lib/workspace/author";
import { getProfileEnrichment } from "@/lib/workspace/enrichment";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import { getLearningProfile } from "@/lib/workspace/learning-profile";
import { getPersona } from "@/lib/workspace/persona";
import {
  createArticleBatch,
  listArticleBatches,
  type ArticleBatchGroup,
} from "@/lib/workspace/articles";
import { getClientAuth } from "@/lib/firebase/client";
import { isInvalidApiKeyError } from "@/lib/llm/parse-json";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import type {
  ArticleDoc,
  ContentLanguage,
  EmojiLevel,
  NewsSuggestion,
} from "@/types/workspace";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function filterArticles(articles: ArticleDoc[], pendingOnly: boolean): ArticleDoc[] {
  if (!pendingOnly) return articles;
  return articles.filter((a) => a.status !== "validated");
}

export function ArticlesHub() {
  const t = useTranslations("setup.articles");
  const tNews = useTranslations("setup.articles.news");
  const locale = useLocale() as ContentLanguage;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingOnly = searchParams.get("pending") === "1";
  const [personaOk, setPersonaOk] = useState<boolean | null>(null);
  const [personaText, setPersonaText] = useState("");
  const [batches, setBatches] = useState<ArticleBatchGroup[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emojiLevel, setEmojiLevel] = useState<EmojiLevel>("light");
  const [loaded, setLoaded] = useState(false);
  const [newsItems, setNewsItems] = useState<NewsSuggestion[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsSuggestion | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsHintPerplexity, setNewsHintPerplexity] = useState(false);
  const [newsLoadedOnce, setNewsLoadedOnce] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    const [p, list, learning] = await Promise.all([
      getPersona(user.uid),
      listArticleBatches(user.uid),
      getLearningProfile(user.uid),
    ]);
    setPersonaOk(p?.status === "validated");
    setPersonaText(p?.promptText ?? "");
    setBatches(list);
    setEmojiLevel(learning?.emojiLevel ?? "light");
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoaded(true);
      return;
    }
    reload().catch(() => setLoaded(true));
  }, [user, authLoading, reload]);

  const loadNews = useCallback(async () => {
    if (!user || !personaText) return;
    setNewsLoading(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) return;

      const [author, audience, enrichment, llmProfile] = await Promise.all([
        getAuthorProfile(user.uid),
        getAudienceProfile(user.uid),
        getProfileEnrichment(user.uid),
        getUserLlmProfile(user.uid),
      ]);
      if (!llmProfile?.apiKey) {
        setError(t("noLlmKey"));
        return;
      }

      const res = await fetch("/api/news/suggestions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentLanguage: author?.contentLanguage ?? locale,
          author,
          audience,
          profileEnrichment: enrichment?.details ?? {},
          personaExcerpt: personaText.slice(0, 1200),
          llm: {
            provider: llmProfile.provider,
            apiKey: llmProfile.apiKey,
            model: llmProfile.model,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "no_recent_news") {
          setError(tNews("noResults"));
          setNewsItems([]);
        } else {
          setError(tNews("loadFailed"));
        }
        return;
      }
      setNewsItems(data.news ?? []);
      setNewsHintPerplexity(!!data.perplexityRecommended);
      setNewsLoadedOnce(true);
      if (data.news?.length === 1) {
        setSelectedNews(data.news[0]);
      }
    } catch {
      setError(tNews("loadFailed"));
    } finally {
      setNewsLoading(false);
    }
  }, [user, personaText, locale, t, tNews]);

  useEffect(() => {
    if (!loaded || !personaOk || newsLoadedOnce || !personaText) return;
    loadNews();
  }, [loaded, personaOk, newsLoadedOnce, personaText, loadNews]);

  async function runGenerate(fromNews: boolean) {
    if (!user || !personaText) return;
    if (fromNews && !selectedNews) {
      setError(tNews("pickOne"));
      return;
    }
    setError(null);
    setPending(true);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) throw new Error("no token");

      const [author, llmProfile, enrichment] = await Promise.all([
        getAuthorProfile(user.uid),
        getUserLlmProfile(user.uid),
        getProfileEnrichment(user.uid),
      ]);

      if (!llmProfile?.apiKey) {
        setError(t("noLlmKey"));
        return;
      }

      const persona = await getPersona(user.uid);
      if (persona?.promptText) setPersonaText(persona.promptText);

      const contentLang = author?.contentLanguage ?? locale;
      const newsSource = fromNews && selectedNews ? newsToSource(selectedNews) : undefined;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120_000);
      let res: Response;
      try {
        res = await fetch("/api/articles/generate", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            personaPromptText: personaText,
            contentLanguage: contentLang,
            emojiLevel,
            profileEnrichment: enrichment?.details ?? {},
            newsSource,
            llm: {
              provider: llmProfile.provider,
              apiKey: llmProfile.apiKey,
              model: llmProfile.model,
            },
          }),
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await res.json();
      if (!res.ok) {
        const detail = typeof data.detail === "string" ? data.detail : "";
        if (isInvalidApiKeyError(detail)) setError(t("invalidApiKey"));
        else setError(t("generateFailed"));
        return;
      }

      const batchId = crypto.randomUUID();
      const ids = await createArticleBatch(
        user.uid,
        batchId,
        data.articles,
        author?.contentLanguage ?? locale,
        emojiLevel,
        newsSource,
      );
      await reload();
      notifyOnboardingProgressChanged();
      if (ids[0]) router.push(`/articles/${ids[0]}`);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setError(t("generateTimeout"));
      } else {
        setError(t("generateFailed"));
      }
    } finally {
      setPending(false);
    }
  }

  async function onGenerate() {
    await runGenerate(false);
  }

  async function onGenerateFromNews() {
    await runGenerate(true);
  }

  const visibleBatches = useMemo(
    () =>
      batches
        .map((batch) => ({
          ...batch,
          articles: filterArticles(batch.articles, pendingOnly),
        }))
        .filter((batch) => batch.articles.length > 0),
    [batches, pendingOnly],
  );

  if (!loaded) {
    return <GeneratingIndicator label="…" className="max-w-xl" />;
  }

  if (!personaOk) {
    return <OnboardingBlockedBanner reason="persona" />;
  }

  return (
    <div className="space-y-6">
      <ArticlesHubHeader
        pendingOnly={pendingOnly}
        onGenerate={onGenerate}
        generating={pending}
      />

      <NewsPickerPanel
        news={newsItems}
        selectedId={selectedNews?.id ?? null}
        onSelect={setSelectedNews}
        loading={newsLoading}
        onRefresh={loadNews}
        perplexityHint={newsHintPerplexity}
      />

      {selectedNews && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={onGenerateFromNews}
            className="rounded-sm bg-ns-tertiary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-ns-tertiary/90 disabled:opacity-50"
          >
            {pending ? tNews("generatingFromNews") : tNews("generateFromNews")}
          </button>
          <p className="text-xs text-ns-secondary">{tNews("generateFromNewsHint")}</p>
        </div>
      )}

      {pending && (
        <GeneratingIndicator
          label={t("generating")}
          hint={t("generatingHint")}
          className="max-w-2xl"
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {visibleBatches.length === 0 && !pending && (
        <p className="text-sm text-ns-secondary">
          {pendingOnly ? t("emptyPending") : t("empty")}
        </p>
      )}

      {visibleBatches.map((batch) => {
        const { generalist, niche } = countScopes(batch.articles);
        return (
        <section key={batch.batchId} className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <h2 className="text-sm font-medium text-ns-secondary">
              {t("batchLabel", {
                date: batch.createdAt.toLocaleDateString(locale),
              })}
            </h2>
            <p className="text-xs text-ns-secondary/60">
              {t("scopeMix", { generalist, niche })}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5 font-bold text-ns-tertiary">
              <span className="h-3 w-3 rounded-sm bg-ns-primary" aria-hidden />
              {t("scope.generalist")}
            </span>
            <span className="inline-flex items-center gap-1.5 font-bold text-ns-tertiary">
              <span className="h-3 w-3 rounded-sm bg-ns-secondary" aria-hidden />
              {t("scope.niche")}
            </span>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {batch.articles.map((a) => {
              const scope = resolveArticleScope(a);
              return (
              <li key={a.id}>
                <Link
                  href={`/articles/${a.id}`}
                  className={`block rounded-xl border border-gray-100 p-4 transition-colors ${SCOPE_CARD_CLASS[scope]}`}
                >
                  <p className="text-right text-[11px] font-medium text-ns-secondary">
                    {t(`status.${a.status}`)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm font-medium text-ns-tertiary">
                    {a.hook || t("untitled")}
                  </p>
                </Link>
              </li>
              );
            })}
          </ul>
        </section>
        );
      })}
    </div>
  );
}
