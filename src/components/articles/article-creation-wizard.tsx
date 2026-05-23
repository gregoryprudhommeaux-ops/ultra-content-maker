"use client";

import {
  WizardProgress,
  resolveWizardProgressStep,
} from "@/components/articles/creation/wizard-progress";
import { InspirationLibraryStep } from "@/components/articles/creation/inspiration-library-step";
import { InspirationSourceChoice } from "@/components/articles/creation/inspiration-source-choice";
import { InspirationUrlStep } from "@/components/articles/creation/inspiration-url-step";
import { EmojiLevelPicker } from "@/components/articles/emoji-level-picker";
import {
  buildWizardInspirationReferenceText,
  isWizardInspirationContextReady,
  toArticleInspirationSource,
  type WizardInspirationContext,
} from "@/lib/inspiration/wizard-context";
import { listSourcesByCategory } from "@/lib/workspace/sources";
import { NewsDetailModal } from "@/components/news/news-detail-modal";
import { NewsPickerPanel } from "@/components/articles/news-picker-panel";
import { PostBriefForm } from "@/components/articles/post-brief-form";
import { OnboardingBlockedBanner } from "@/components/onboarding/onboarding-blocked-banner";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { useAuth } from "@/components/auth/auth-provider";
import { notifyOnboardingProgressChanged } from "@/contexts/onboarding-progress-context";
import { heuristicBriefNicheCheck } from "@/lib/articles/brief-niche-check";
import { DEFAULT_POST_BRIEF, saveStoredPostBrief } from "@/lib/articles/post-brief-storage";
import { newsToSource } from "@/lib/news/to-source";
import { isInvalidApiKeyError } from "@/lib/llm/parse-json";
import {
  isPostBriefComplete,
  isWizardBriefComplete,
  type WizardCreationMode,
} from "@/lib/prompts/post-brief";
import { getAuthorProfile } from "@/lib/workspace/author";
import { getProfileEnrichment } from "@/lib/workspace/enrichment";
import {
  getLearningProfile,
  saveDefaultEmojiLevel,
} from "@/lib/workspace/learning-profile";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import { getPersona } from "@/lib/workspace/persona";
import {
  createArticleBatch,
  replaceArticleDraft,
} from "@/lib/workspace/articles";
import { upsertNewsArchiveBatch } from "@/lib/workspace/news-archive";
import { getClientAuth } from "@/lib/firebase/client";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import type {
  ArticleScope,
  BriefNicheCheck,
  ContentLanguage,
  EmojiLevel,
  InspirationInputKind,
  NewsSuggestion,
  PostBrief,
  SourceLink,
} from "@/types/workspace";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type CreationMode = WizardCreationMode;
type Step =
  | "mode"
  | "news"
  | "inspiration-input"
  | "paste"
  | "inspiration-url"
  | "inspiration-library"
  | "brief"
  | "generating"
  | "batch-done"
  | "inspiration-done";

export function ArticleCreationWizard() {
  const t = useTranslations("setup.articles.create");
  const tArticles = useTranslations("setup.articles");
  const tNews = useTranslations("setup.articles.news");
  const locale = useLocale() as ContentLanguage;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const initialModeFromUrl = useRef(false);

  const [personaOk, setPersonaOk] = useState<boolean | null>(null);
  const [personaText, setPersonaText] = useState("");
  const [emojiLevel, setEmojiLevel] = useState<EmojiLevel>("light");
  const [loaded, setLoaded] = useState(false);

  const [mode, setMode] = useState<CreationMode | null>(null);
  const [step, setStep] = useState<Step>("mode");

  const [newsItems, setNewsItems] = useState<NewsSuggestion[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsSuggestion | null>(null);
  const [newsDetailItem, setNewsDetailItem] = useState<NewsSuggestion | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsHintPerplexity, setNewsHintPerplexity] = useState(false);

  const [inspirationCtx, setInspirationCtx] = useState<WizardInspirationContext | null>(
    null,
  );
  const [inspirationLibrary, setInspirationLibrary] = useState<SourceLink[]>([]);
  const [targetScope, setTargetScope] = useState<ArticleScope>("generalist");
  const [postBrief, setPostBrief] = useState<PostBrief>({ ...DEFAULT_POST_BRIEF });
  const [briefSuggesting, setBriefSuggesting] = useState(false);
  const briefSuggestedRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [batchArticleIds, setBatchArticleIds] = useState<string[]>([]);
  const [inspirationArticle, setInspirationArticle] = useState<{
    id: string;
    hook: string;
    body: string;
    ps?: string;
  } | null>(null);
  const [nicheCheck, setNicheCheck] = useState<BriefNicheCheck | null>(null);
  const [nicheLoading, setNicheLoading] = useState(false);

  const heuristicNiche = useMemo(
    () => heuristicBriefNicheCheck(postBrief),
    [postBrief],
  );

  const progressStep = resolveWizardProgressStep(step, mode);

  const selectedLibrarySource = useMemo(
    () =>
      inspirationCtx?.sourceId
        ? inspirationLibrary.find((s) => s.id === inspirationCtx.sourceId) ?? null
        : null,
    [inspirationCtx?.sourceId, inspirationLibrary],
  );

  const inspirationReferenceText = useMemo(
    () =>
      inspirationCtx
        ? buildWizardInspirationReferenceText(inspirationCtx, selectedLibrarySource)
        : "",
    [inspirationCtx, selectedLibrarySource],
  );

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [persona, learning] = await Promise.all([
        getPersona(user.uid),
        getLearningProfile(user.uid),
      ]);
      setPersonaOk(!!persona?.validatedAt && !!persona.promptText?.trim());
      setPersonaText(persona?.promptText ?? "");
      setEmojiLevel(learning?.emojiLevel ?? "light");
      setLoaded(true);
    })();
  }, [user]);

  useEffect(() => {
    saveStoredPostBrief(postBrief);
  }, [postBrief]);

  useEffect(() => {
    if (mode === "profile" && isPostBriefComplete(postBrief)) {
      setNicheCheck(heuristicNiche);
      return;
    }
    if (
      mode &&
      mode !== "profile" &&
      isWizardBriefComplete(postBrief, mode) &&
      postBrief.problem.trim().length >= 8
    ) {
      setNicheCheck(heuristicNiche);
      return;
    }
    setNicheCheck(null);
  }, [postBrief, mode, heuristicNiche]);

  const onAnalyzeNiche = useCallback(async () => {
    if (!user || !mode) return;
    const canAnalyze =
      mode === "profile"
        ? isPostBriefComplete(postBrief)
        : isWizardBriefComplete(postBrief, mode);
    if (!canAnalyze) return;

    setNicheLoading(true);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const llmProfile = await getUserLlmProfile(user.uid);
      if (!token || !llmProfile?.apiKey) return;

      const author = await getAuthorProfile(user.uid);
      const res = await fetch("/api/articles/brief-check", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postBrief,
          contentLanguage: author?.contentLanguage ?? locale,
          personaPromptText: personaText,
          useLlm: true,
          llm: {
            provider: llmProfile.provider,
            apiKey: llmProfile.apiKey,
            model: llmProfile.model,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.check) setNicheCheck(data.check);
    } finally {
      setNicheLoading(false);
    }
  }, [user, mode, postBrief, personaText, locale]);

  async function onEmojiLevelChange(level: EmojiLevel) {
    setEmojiLevel(level);
    if (user) {
      try {
        await saveDefaultEmojiLevel(user.uid, level);
      } catch {
        /* preference save is best-effort */
      }
    }
  }

  const loadNews = useCallback(async () => {
    if (!user || !personaText) return;
    setNewsLoading(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const llmProfile = await getUserLlmProfile(user.uid);
      if (!token || !llmProfile?.apiKey) {
        setError(tArticles("noLlmKey"));
        return;
      }
      const author = await getAuthorProfile(user.uid);
      const res = await fetch("/api/news/suggestions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personaPromptText: personaText,
          contentLanguage: author?.contentLanguage ?? locale,
          llm: {
            provider: llmProfile.provider,
            apiKey: llmProfile.apiKey,
            model: llmProfile.model,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "no_recent_news" ? tNews("noResults") : tNews("loadFailed"),
        );
        setNewsItems([]);
        return;
      }
      setNewsItems(data.news ?? []);
      setNewsHintPerplexity(!!data.perplexityRecommended);
      if (data.news?.length) {
        await upsertNewsArchiveBatch(user.uid, data.news);
      }
    } catch {
      setError(tNews("loadFailed"));
    } finally {
      setNewsLoading(false);
    }
  }, [user, personaText, locale, tArticles, tNews]);

  const suggestBrief = useCallback(async () => {
    if (!user || !mode || mode === "profile") return;
    if (mode === "news" && !selectedNews) return;
    if (mode === "inspiration" && !isWizardInspirationContextReady(inspirationCtx, selectedLibrarySource)) {
      return;
    }

    setBriefSuggesting(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const llmProfile = await getUserLlmProfile(user.uid);
      const author = await getAuthorProfile(user.uid);
      if (!token || !llmProfile?.apiKey) {
        setError(tArticles("noLlmKey"));
        return;
      }

      const res = await fetch("/api/articles/brief-suggest", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: mode === "news" ? "news" : "inspiration",
          contentLanguage: author?.contentLanguage ?? locale,
          personaPromptText: personaText,
          newsSource:
            mode === "news" && selectedNews ? newsToSource(selectedNews) : undefined,
          inspirationText:
            mode === "inspiration" ? inspirationReferenceText : undefined,
          inspirationMeta:
            mode === "inspiration" && inspirationCtx
              ? (toArticleInspirationSource(inspirationCtx, selectedLibrarySource) ??
                undefined)
              : undefined,
          llm: {
            provider: llmProfile.provider,
            apiKey: llmProfile.apiKey,
            model: llmProfile.model,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.brief) {
        setError(t("briefSuggestFailed"));
        return;
      }
      setPostBrief(data.brief);
    } catch {
      setError(t("briefSuggestFailed"));
    } finally {
      setBriefSuggesting(false);
    }
  }, [
    user,
    mode,
    selectedNews,
    inspirationCtx,
    inspirationReferenceText,
    selectedLibrarySource,
    personaText,
    locale,
    t,
    tArticles,
  ]);

  useEffect(() => {
    if (step !== "brief" || !mode || mode === "profile") return;
    if (briefSuggestedRef.current) return;
    briefSuggestedRef.current = true;
    void suggestBrief();
  }, [step, mode, suggestBrief]);

  async function runGenerate(replaceArticleId?: string) {
    if (!user || !personaText || !mode) return;
    if (!isWizardBriefComplete(postBrief, mode)) {
      setError(tArticles("briefIncomplete"));
      return;
    }
    if (mode === "news" && !selectedNews) {
      setError(tNews("pickOne"));
      return;
    }
    if (
      mode === "inspiration" &&
      !isWizardInspirationContextReady(inspirationCtx, selectedLibrarySource)
    ) {
      setError(t("inspiration.referenceRequired"));
      return;
    }

    setError(null);
    setStep("generating");

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
        setStep(mode === "inspiration" ? "inspiration-done" : "brief");
        return;
      }

      const contentLang = author?.contentLanguage ?? locale;
      const newsSource =
        mode === "news" && selectedNews ? newsToSource(selectedNews) : undefined;
      const articleCount = mode === "inspiration" ? 1 : 4;

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
            articleCount,
            inspirationText:
              mode === "inspiration" ? inspirationReferenceText : undefined,
            inspirationSource:
              mode === "inspiration" && inspirationCtx
                ? toArticleInspirationSource(inspirationCtx, selectedLibrarySource)
                : undefined,
            targetScope: mode === "inspiration" ? targetScope : undefined,
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
        setStep(
          mode === "inspiration" && inspirationArticle
            ? "inspiration-done"
            : "brief",
        );
        return;
      }

      const articles = data.articles as {
        hook: string;
        body: string;
        ps?: string;
        scope?: ArticleScope;
        hashtags?: string[];
      }[];

      if (mode === "inspiration") {
        const item = articles[0];
        if (replaceArticleId) {
          await replaceArticleDraft(
            user.uid,
            replaceArticleId,
            { ...item, scope: targetScope },
            postBrief,
          );
          setInspirationArticle({
            id: replaceArticleId,
            hook: item.hook,
            body: item.body,
            ps: item.ps,
          });
        } else {
          const batchId = crypto.randomUUID();
          const inspirationMeta =
            inspirationCtx &&
            toArticleInspirationSource(inspirationCtx, selectedLibrarySource);
          const ids = await createArticleBatch(
            user.uid,
            batchId,
            [{ ...item, scope: targetScope }],
            contentLang,
            emojiLevel,
            undefined,
            postBrief,
            inspirationMeta ?? undefined,
          );
          setInspirationArticle({
            id: ids[0],
            hook: item.hook,
            body: item.body,
            ps: item.ps,
          });
        }
        setStep("inspiration-done");
      } else {
        const batchId = crypto.randomUUID();
        const ids = await createArticleBatch(
          user.uid,
          batchId,
          articles,
          contentLang,
          emojiLevel,
          newsSource,
          postBrief,
        );
        setBatchArticleIds(ids);
        setStep("batch-done");
      }
      notifyOnboardingProgressChanged();
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setError(tArticles("generateTimeout"));
      } else {
        setError(tArticles("generateFailed"));
      }
      setStep(
        mode === "inspiration" && inspirationArticle
          ? "inspiration-done"
          : "brief",
      );
    }
  }

  const loadInspirationLibrary = useCallback(async () => {
    if (!user) return;
    const [posts, profiles] = await Promise.all([
      listSourcesByCategory(user.uid, "inspiration_post"),
      listSourcesByCategory(user.uid, "inspiration_profile"),
    ]);
    setInspirationLibrary([...posts, ...profiles]);
  }, [user]);

  function pickMode(next: CreationMode) {
    setMode(next);
    setError(null);
    briefSuggestedRef.current = false;
    setPostBrief({ ...DEFAULT_POST_BRIEF });
    setInspirationCtx(null);
    if (next === "profile") {
      setStep("brief");
    } else if (next === "news") {
      setStep("news");
      void loadNews();
    } else {
      void loadInspirationLibrary();
      setStep("inspiration-input");
    }
  }

  function pickInspirationInput(kind: InspirationInputKind) {
    setInspirationCtx({ kind, excerpt: "" });
    setError(null);
    if (kind === "paste") setStep("paste");
    else if (kind === "url") setStep("inspiration-url");
    else setStep("inspiration-library");
  }

  function goToBriefFromInspiration() {
    if (!isWizardInspirationContextReady(inspirationCtx, selectedLibrarySource)) {
      setError(t("inspiration.referenceRequired"));
      return;
    }
    briefSuggestedRef.current = false;
    setStep("brief");
  }

  function selectLibrarySource(source: SourceLink) {
    setInspirationCtx((prev) => ({
      kind: "library",
      sourceId: source.id,
      url: source.url,
      label: source.label,
      category: source.category,
      likedAspects: source.likedAspects,
      whyLike: source.whyLike,
      excerpt: prev?.excerpt ?? "",
    }));
  }

  useEffect(() => {
    if (!loaded || initialModeFromUrl.current) return;
    const param = searchParams.get("mode");
    if (param === "profile" || param === "news" || param === "inspiration") {
      initialModeFromUrl.current = true;
      pickMode(param);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on load
  }, [loaded, searchParams]);

  function goBack() {
    setError(null);
    if (step === "brief") {
      if (mode === "profile") setStep("mode");
      else if (mode === "news") setStep("news");
      else if (inspirationCtx?.kind === "paste") setStep("paste");
      else if (inspirationCtx?.kind === "url") setStep("inspiration-url");
      else if (inspirationCtx?.kind === "library") setStep("inspiration-library");
      else setStep("inspiration-input");
      briefSuggestedRef.current = false;
    } else if (
      step === "paste" ||
      step === "inspiration-url" ||
      step === "inspiration-library"
    ) {
      setStep("inspiration-input");
    } else if (step === "inspiration-input" || step === "news") {
      setStep("mode");
      setMode(null);
      setInspirationCtx(null);
    } else if (step === "batch-done" || step === "inspiration-done") {
      router.push("/articles");
    } else {
      setStep("mode");
    }
  }

  if (authLoading || !loaded) {
    return <GeneratingIndicator label="…" className="max-w-xl" />;
  }

  if (!user) {
    return null;
  }

  if (!personaOk) {
    return <OnboardingBlockedBanner reason="persona" />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/articles"
          className="text-sm text-ns-secondary hover:text-ns-tertiary"
        >
          ← {t("backToList")}
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ns-tertiary">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-ns-secondary">{t("subtitle")}</p>
      </header>

      {step !== "mode" && (
        <WizardProgress mode={mode} activeStep={progressStep} />
      )}

      {step !== "mode" &&
        step !== "generating" &&
        step !== "batch-done" &&
        step !== "inspiration-done" && (
          <button
            type="button"
            onClick={goBack}
            className="text-sm font-medium text-ns-secondary underline hover:text-ns-tertiary"
          >
            {t("back")}
          </button>
        )}

      {step === "mode" && (
        <div className="grid gap-4 sm:grid-cols-1">
          {(
            [
              {
                id: "profile" as const,
                title: t("modes.profile.title"),
                desc: t("modes.profile.desc"),
              },
              {
                id: "news" as const,
                title: t("modes.news.title"),
                desc: t("modes.news.desc"),
              },
              {
                id: "inspiration" as const,
                title: t("modes.inspiration.title"),
                desc: t("modes.inspiration.desc"),
              },
            ] as const
          ).map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => pickMode(card.id)}
              className="rounded-xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-colors hover:border-ns-primary hover:bg-ns-brand-light/30"
            >
              <p className="text-base font-semibold text-ns-tertiary">{card.title}</p>
              <p className="mt-2 text-sm text-ns-secondary">{card.desc}</p>
            </button>
          ))}
        </div>
      )}

      {step === "news" && (
        <div className="space-y-4">
          <p className="text-sm text-ns-secondary">{t("newsIntro")}</p>
          <p className="text-xs text-ns-secondary">
            <Link href="/news/archive" className="font-medium underline">
              {t("browseArchive")}
            </Link>
          </p>
          <NewsPickerPanel
            news={newsItems}
            selectedId={selectedNews?.id ?? null}
            onSelect={setSelectedNews}
            loading={newsLoading}
            onRefresh={loadNews}
            perplexityHint={newsHintPerplexity}
            detailItem={newsDetailItem}
            onDetailItemChange={setNewsDetailItem}
          />
          <button
            type="button"
            disabled={!selectedNews}
            onClick={() => {
              briefSuggestedRef.current = false;
              setStep("brief");
            }}
            className={`${BTN_PRIMARY} disabled:opacity-50`}
          >
            {t("continueWithNews")}
          </button>
        </div>
      )}

      {step === "inspiration-input" && (
        <InspirationSourceChoice
          libraryCount={inspirationLibrary.length}
          onSelect={pickInspirationInput}
        />
      )}

      {step === "paste" && (
        <section className="space-y-4 rounded-xl border border-gray-100 bg-white p-5">
          <div>
            <h2 className="text-base font-semibold text-ns-tertiary">
              {t("pasteTitle")}
            </h2>
            <p className="mt-1 text-sm text-ns-secondary">{t("pasteHint")}</p>
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="inspiration-paste">
              {t("pasteLabel")}
            </label>
            <textarea
              id="inspiration-paste"
              rows={12}
              value={inspirationCtx?.excerpt ?? ""}
              onChange={(e) =>
                setInspirationCtx((prev) => ({
                  kind: "paste",
                  excerpt: e.target.value,
                }))
              }
              placeholder={t("pastePlaceholder")}
              className={`${INPUT_CLASS} mt-1 font-mono text-sm`}
            />
          </div>
          <button
            type="button"
            disabled={(inspirationCtx?.excerpt.trim().length ?? 0) < 40}
            onClick={goToBriefFromInspiration}
            className={`${BTN_PRIMARY} disabled:opacity-50`}
          >
            {t("continueToBrief")}
          </button>
        </section>
      )}

      {step === "inspiration-url" && (
        <InspirationUrlStep
          url={inspirationCtx?.url ?? ""}
          excerpt={inspirationCtx?.excerpt ?? ""}
          onUrlChange={(url) =>
            setInspirationCtx((prev) => ({
              kind: "url",
              url,
              excerpt: prev?.excerpt ?? "",
            }))
          }
          onExcerptChange={(excerpt) =>
            setInspirationCtx((prev) => ({
              kind: "url",
              url: prev?.url ?? "",
              excerpt,
            }))
          }
          onContinue={goToBriefFromInspiration}
        />
      )}

      {step === "inspiration-library" && (
        <InspirationLibraryStep
          sources={inspirationLibrary}
          selectedId={inspirationCtx?.sourceId ?? null}
          onSelect={selectLibrarySource}
          excerpt={inspirationCtx?.excerpt ?? ""}
          onExcerptChange={(excerpt) =>
            setInspirationCtx((prev) =>
              prev
                ? { ...prev, excerpt }
                : { kind: "library", excerpt },
            )
          }
          onContinue={goToBriefFromInspiration}
        />
      )}

      {step === "brief" && mode && (
        <div className="space-y-4">
          {mode === "news" && selectedNews && (
            <div className="rounded-lg border border-sky-200/80 bg-sky-50/80 px-4 py-3 text-sm">
              <p className="text-xs font-medium text-ns-secondary">{t("selectedNewsLabel")}</p>
              <p className="mt-1 font-medium text-ns-tertiary">{selectedNews.title}</p>
            </div>
          )}
          {mode === "inspiration" && inspirationReferenceText.length >= 40 && (
            <div className="rounded-lg border border-gray-100 bg-ns-brand-light/50 px-4 py-3 text-sm">
              <p className="text-xs font-medium text-ns-secondary">
                {inspirationCtx?.kind === "library"
                  ? t("inspiration.libraryPreviewLabel")
                  : inspirationCtx?.kind === "url"
                    ? t("inspiration.urlPreviewLabel")
                    : t("pastedPreviewLabel")}
              </p>
              {selectedLibrarySource && (
                <a
                  href={selectedLibrarySource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-xs font-medium text-ns-primary underline truncate"
                >
                  {selectedLibrarySource.label || selectedLibrarySource.url}
                </a>
              )}
              <p className="mt-1 line-clamp-3 text-ns-secondary whitespace-pre-wrap">
                {inspirationReferenceText.slice(0, 280)}
                {inspirationReferenceText.length > 280 ? "…" : ""}
              </p>
            </div>
          )}
          <PostBriefForm
            brief={postBrief}
            onChange={setPostBrief}
            wizardMode={mode}
            showScope={mode === "inspiration"}
            targetScope={targetScope}
            onScopeChange={setTargetScope}
            briefSuggesting={briefSuggesting}
            nicheCheck={nicheCheck}
            onAnalyzeNiche={onAnalyzeNiche}
            nicheLoading={nicheLoading}
          />
          <section className="rounded-xl border border-gray-100 bg-white p-4">
            <EmojiLevelPicker
              value={emojiLevel}
              onChange={(level) => void onEmojiLevelChange(level)}
              variant="compact"
            />
          </section>
          <button
            type="button"
            disabled={!isWizardBriefComplete(postBrief, mode) || briefSuggesting}
            onClick={() => void runGenerate()}
            className={`${BTN_PRIMARY} disabled:opacity-50`}
          >
            {mode === "inspiration" ? t("generateOne") : t("generateFour")}
          </button>
        </div>
      )}

      {step === "generating" && (
        <GeneratingIndicator
          label={tArticles("generating")}
          hint={tArticles("generatingHint")}
          className="max-w-2xl"
        />
      )}

      {step === "batch-done" && (
        <section className="space-y-4 rounded-xl border border-gray-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-ns-tertiary">{t("batchDoneTitle")}</h2>
          <p className="text-sm text-ns-secondary">{t("batchDoneHint")}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {batchArticleIds.map((id, i) => (
              <li key={id}>
                <Link
                  href={`/articles/${id}`}
                  className="block rounded-lg border border-gray-100 bg-ns-brand-light/40 px-4 py-3 text-sm font-medium text-ns-tertiary hover:border-ns-primary"
                >
                  {t("openDraft", { n: i + 1 })}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/articles" className={`inline-block ${BTN_PRIMARY}`}>
            {t("backToList")}
          </Link>
        </section>
      )}

      {step === "inspiration-done" && inspirationArticle && (
        <section className="space-y-4 rounded-xl border border-gray-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-ns-tertiary">
            {t("inspirationDoneTitle")}
          </h2>
          <p className="text-sm text-ns-secondary">{t("inspirationDoneHint")}</p>
          <div className="rounded-lg bg-ns-brand-light/50 p-4">
            <p className="font-semibold text-ns-tertiary whitespace-pre-wrap">
              {inspirationArticle.hook}
            </p>
            <p className="mt-3 text-sm text-ns-secondary whitespace-pre-wrap line-clamp-6">
              {inspirationArticle.body}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/articles/${inspirationArticle.id}`}
              className={BTN_PRIMARY}
            >
              {t("openArticle")}
            </Link>
            <button
              type="button"
              onClick={() => void runGenerate(inspirationArticle.id)}
              className="rounded-lg border border-ns-alternate bg-white px-4 py-2.5 text-sm font-medium text-ns-tertiary hover:bg-ns-brand-light"
            >
              {t("regenerateAngle")}
            </button>
          </div>
        </section>
      )}

      <NewsDetailModal
        item={newsDetailItem}
        onClose={() => setNewsDetailItem(null)}
      />

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
