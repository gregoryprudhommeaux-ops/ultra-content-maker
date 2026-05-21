"use client";

import {
  countScopes,
  resolveArticleScope,
  SCOPE_CARD_CLASS,
} from "@/lib/articles/scope";
import { EmojiLevelPicker } from "@/components/articles/emoji-level-picker";
import { BTN_PRIMARY, PAGE_DESC, PAGE_TITLE } from "@/lib/ui/nextstep";
import { SetupStepNav } from "@/components/setup/setup-step-nav";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { useAuth } from "@/components/auth/auth-provider";
import { getAuthorProfile } from "@/lib/workspace/author";
import { getProfileEnrichment } from "@/lib/workspace/enrichment";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import { recordEmojiPreference } from "@/lib/persona/sync-persona-from-feedback";
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
import type { ArticleDoc, ContentLanguage, EmojiLevel } from "@/types/workspace";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function filterArticles(articles: ArticleDoc[], pendingOnly: boolean): ArticleDoc[] {
  if (!pendingOnly) return articles;
  return articles.filter((a) => a.status !== "validated");
}

export function ArticlesHub() {
  const t = useTranslations("setup.articles");
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

  const reload = useCallback(async () => {
    if (!user) return;
    const [p, list] = await Promise.all([
      getPersona(user.uid),
      listArticleBatches(user.uid),
    ]);
    setPersonaOk(p?.status === "validated");
    setPersonaText(p?.promptText ?? "");
    setBatches(list);
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

  async function onGenerate() {
    if (!user || !personaText) return;
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

      const contentLang = author?.contentLanguage ?? locale;
      await recordEmojiPreference(user.uid, emojiLevel, contentLang);
      const persona = await getPersona(user.uid);
      if (persona?.promptText) setPersonaText(persona.promptText);

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
      );
      await reload();
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
    return (
      <div className="space-y-4">
        <SetupStepNav />
        <p className="text-sm text-ns-secondary">{t("needPersona")}</p>
        <Link href="/persona" className="font-medium text-ns-tertiary underline">
          {t("goPersona")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SetupStepNav />
      <div className="flex flex-wrap gap-2">
        <Link
          href="/articles?pending=1"
          className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide ${
            pendingOnly
              ? "bg-ns-primary text-black"
              : "border border-ns-alternate text-ns-secondary hover:border-ns-primary"
          }`}
        >
          {t("filter.pending")}
        </Link>
        <Link
          href="/articles"
          className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide ${
            !pendingOnly
              ? "bg-ns-primary text-black"
              : "border border-ns-alternate text-ns-secondary hover:border-ns-primary"
          }`}
        >
          {t("filter.all")}
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={PAGE_TITLE}>
            {pendingOnly ? t("titlePending") : t("title")}
          </h1>
          <p className={PAGE_DESC}>
            {pendingOnly ? t("descriptionPending") : t("description")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <EmojiLevelPicker value={emojiLevel} onChange={setEmojiLevel} />
          <button
            type="button"
            disabled={pending}
            onClick={onGenerate}
            className={BTN_PRIMARY}
          >
            {pending ? t("generating") : t("generateBatch")}
          </button>
        </div>
      </div>

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
