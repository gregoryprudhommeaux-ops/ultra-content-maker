"use client";

import { NewsCard, formatNewsDate } from "@/components/news/news-card";
import { loadStoredPostBrief } from "@/lib/articles/post-brief-storage";
import { isPostBriefComplete } from "@/lib/prompts/post-brief";
import { OnboardingBlockedBanner } from "@/components/onboarding/onboarding-blocked-banner";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import { isInvalidApiKeyError } from "@/lib/llm/parse-json";
import { newsToSource } from "@/lib/news/to-source";
import { getAuthorProfile } from "@/lib/workspace/author";
import { createArticleBatch } from "@/lib/workspace/articles";
import { getProfileEnrichment } from "@/lib/workspace/enrichment";
import { getLearningProfile } from "@/lib/workspace/learning-profile";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import {
  listArchivedNews,
  type ArchivedNewsDoc,
} from "@/lib/workspace/news-archive";
import { getPersona } from "@/lib/workspace/persona";
import { notifyOnboardingProgressChanged } from "@/contexts/onboarding-progress-context";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ContentLanguage, EmojiLevel } from "@/types/workspace";
import { useCallback, useEffect, useState } from "react";

export function NewsArchiveHub() {
  const t = useTranslations("setup.news");
  const tArticles = useTranslations("setup.articles");
  const locale = useLocale() as ContentLanguage;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [personaOk, setPersonaOk] = useState<boolean | null>(null);
  const [personaText, setPersonaText] = useState("");
  const [archived, setArchived] = useState<ArchivedNewsDoc[]>([]);
  const [selected, setSelected] = useState<ArchivedNewsDoc | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emojiLevel, setEmojiLevel] = useState<EmojiLevel>("light");

  const reload = useCallback(async () => {
    if (!user) return;
    const [p, items, learning] = await Promise.all([
      getPersona(user.uid),
      listArchivedNews(user.uid),
      getLearningProfile(user.uid),
    ]);
    setPersonaOk(p?.status === "validated");
    setPersonaText(p?.promptText ?? "");
    setArchived(items);
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

  async function runGenerate() {
    if (!user || !personaText || !selected) {
      setError(t("pickOne"));
      return;
    }

    const postBrief = loadStoredPostBrief();
    if (!isPostBriefComplete(postBrief)) {
      setError(tArticles("briefIncomplete"));
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
        setError(tArticles("noLlmKey"));
        return;
      }

      const persona = await getPersona(user.uid);
      if (persona?.promptText) setPersonaText(persona.promptText);

      const contentLang = author?.contentLanguage ?? locale;
      const newsSource = newsToSource(selected);

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
            postBrief,
            newsSource,
            articleCount: 2,
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
        if (isInvalidApiKeyError(detail)) setError(tArticles("invalidApiKey"));
        else setError(tArticles("generateFailed"));
        return;
      }

      const batchId = crypto.randomUUID();
      await createArticleBatch(
        user.uid,
        batchId,
        data.articles,
        author?.contentLanguage ?? locale,
        emojiLevel,
        newsSource,
        postBrief,
      );
      notifyOnboardingProgressChanged();
      router.push("/articles");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setError(tArticles("generateTimeout"));
      } else {
        setError(tArticles("generateFailed"));
      }
    } finally {
      setPending(false);
    }
  }

  if (!loaded) {
    return <GeneratingIndicator label="…" className="max-w-xl" />;
  }

  if (!personaOk) {
    return <OnboardingBlockedBanner reason="persona" />;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-ns-tertiary">{t("title")}</h1>
        <p className="text-sm text-ns-secondary">{t("subtitle")}</p>
        <Link
          href="/articles"
          className="inline-block text-sm font-medium text-ns-tertiary underline hover:text-ns-primary"
        >
          {t("backToArticles")}
        </Link>
      </header>

      {archived.length === 0 && (
        <p className="text-sm text-ns-secondary">{t("empty")}</p>
      )}

      {archived.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {archived.map((item) => (
            <li key={item.id}>
              <NewsCard
                item={item}
                selected={selected?.id === item.id}
                onClick={() => setSelected(item)}
              />
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <section className="rounded-xl border border-gray-100 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-ns-secondary">
                {selected.sourceName ?? t("unknownSource")} ·{" "}
                {formatNewsDate(selected.publishedAt, locale)}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-ns-tertiary">{selected.title}</h2>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-sm text-ns-secondary underline hover:text-ns-tertiary"
            >
              {t("closeDetail")}
            </button>
          </div>
          <p className="text-sm leading-relaxed text-ns-secondary whitespace-pre-wrap">
            {selected.summary}
          </p>
          <a
            href={selected.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-medium text-ns-primary underline"
          >
            {t("readSource")}
          </a>
          <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              disabled={pending}
              onClick={runGenerate}
              className="rounded-sm bg-ns-tertiary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-ns-tertiary/90 disabled:opacity-50"
            >
              {pending ? t("generatingFromNews") : t("generateFromNews")}
            </button>
            <p className="text-xs text-ns-secondary">{t("generateFromNewsHint")}</p>
          </div>
        </section>
      )}

      {pending && (
        <GeneratingIndicator
          label={tArticles("generating")}
          hint={t("generatingHint")}
          className="max-w-2xl"
        />
      )}

      {error && (
        <div className="space-y-1">
          <p className="text-sm text-red-600">{error}</p>
          {error === tArticles("briefIncomplete") && (
            <Link
              href="/articles"
              className="text-sm font-medium text-ns-tertiary underline"
            >
              {t("briefOnArticles")}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
