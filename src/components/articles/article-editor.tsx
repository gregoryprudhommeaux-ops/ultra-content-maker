"use client";

import { ArticleFormatPanel } from "@/components/articles/article-format-panel";
import { ArticleIllustrationPanel } from "@/components/articles/article-illustration-panel";
import { ArticlePerformancePanel } from "@/components/articles/article-performance-panel";
import { ArticleQualityPanel } from "@/components/articles/article-quality-panel";
import { ArticleSlopPanel } from "@/components/articles/article-slop-panel";
import { ArticleShareActions } from "@/components/articles/article-share-actions";
import {
  getReviseIntentPrompt,
  type ReviseIntent,
} from "@/lib/prompts/revise-intent-prompts";
import { bodyContainsExternalLink } from "@/lib/linkedin/body-links";
import { EmojiLevelPicker } from "@/components/articles/emoji-level-picker";
import { ToneEdgePicker } from "@/components/articles/tone-edge-picker";
import { LinkedInCharCount } from "@/components/articles/linkedin-char-count";
import {
  ButtonSpinner,
  GeneratingIndicator,
} from "@/components/ui/generating-indicator";
import { useAuth } from "@/components/auth/auth-provider";
import { getProfileEnrichment } from "@/lib/workspace/enrichment";
import { getPersona } from "@/lib/workspace/persona";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import {
  hasReviseInput,
  mergeRefinementWithDefaults,
  YES_NO_ONLY_QUESTIONS,
} from "@/lib/articles/refinement";
import { copyAndOpenLinkedInComposer } from "@/lib/linkedin/composer";
import { formatHashtagsLine } from "@/lib/linkedin/hashtags";
import {
  buildExportText,
  getArticle,
  markArticleRegenerated,
  saveArticleIllustration,
  saveArticlePerformanceSignals,
  saveArticleQuality,
  saveArticleRefinement,
  saveArticleSlopAnalysis,
  updateArticleContent,
  validateArticleWithCta,
} from "@/lib/workspace/articles";
import {
  persistArticleRefinementAndSyncPersona,
  recordArticleRefinementFeedback,
  recordArticleValidateFeedback,
} from "@/lib/persona/sync-persona-from-feedback";
import { getClientAuth } from "@/lib/firebase/client";
import { isInvalidApiKeyError } from "@/lib/llm/parse-json";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type {
  ArticleDoc,
  ArticleIllustration,
  ArticleQualityScores,
  ArticleRefinement,
  ArticleScope,
  CtaIntensity,
  CtaSuggestion,
  EmojiLevel,
  RefinementAnswer,
  ToneEdge,
} from "@/types/workspace";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = { articleId: string };

export function ArticleEditor({ articleId }: Props) {
  const t = useTranslations("setup.articles.detail");
  const tArticles = useTranslations("setup.articles");
  const tRef = useTranslations("setup.articles.refinement");
  const tCta = useTranslations("setup.articles.cta");
  const tIll = useTranslations("setup.articles.illustration");
  const tQuality = useTranslations("setup.articles.quality");
  const { user, loading: authLoading } = useAuth();
  const [article, setArticle] = useState<ArticleDoc | null>(null);
  const [personaText, setPersonaText] = useState("");
  const [ctaSuggestions, setCtaSuggestions] = useState<CtaSuggestion[]>([]);
  const [selectedCtaStyle, setSelectedCtaStyle] = useState<CtaIntensity | null>(
    null,
  );
  const [ctaLoading, setCtaLoading] = useState(false);
  const [illustration, setIllustration] = useState<ArticleIllustration | null>(null);
  const [illustrationLoading, setIllustrationLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<"revise" | "validate" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [errorScope, setErrorScope] = useState<"refine" | "cta" | null>(null);
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [qualityScores, setQualityScores] = useState<ArticleQualityScores | null>(
    null,
  );
  const [alternativeHooks, setAlternativeHooks] = useState<string[]>([]);
  const [qualityCritique, setQualityCritique] = useState<string | null>(null);

  const loadCtaSuggestions = useCallback(async () => {
    if (!user || !article || !personaText) return;
    setCtaLoading(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const [enrichment, llmProfile] = await Promise.all([
        getProfileEnrichment(user.uid),
        getUserLlmProfile(user.uid),
      ]);
      if (!token || !llmProfile?.apiKey) return;

      const res = await fetch("/api/articles/cta-suggestions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personaPromptText: personaText,
          contentLanguage: article.contentLanguage,
          hook: article.hook,
          body: article.body,
          ps: article.ps,
          profileEnrichment: enrichment?.details ?? {},
          postObjective: article.postBrief?.objective ?? "credibility",
          llm: {
            provider: llmProfile.provider,
            apiKey: llmProfile.apiKey,
            model: llmProfile.model,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(tCta("loadFailed"));
        return;
      }
      const list = data.suggestions ?? [];
      setCtaSuggestions(list);
      setSelectedCtaStyle((prev) => {
        if (prev) return prev;
        return (
          list.find((s: CtaSuggestion) => s.style === "medium")?.style ??
          list[0]?.style ??
          null
        );
      });
    } catch {
      setError(tCta("loadFailed"));
    } finally {
      setCtaLoading(false);
    }
  }, [user, article, personaText, tCta]);

  const loadIllustrationSuggestions = useCallback(
    async (force = false, opts?: { quiet?: boolean }) => {
      if (!user || !article) return;
      if (!force && article.illustration) {
        setIllustration(article.illustration);
        return;
      }
      setIllustrationLoading(true);
      if (!opts?.quiet) setError(null);
      try {
        const auth = getClientAuth();
        const token = auth ? await auth.currentUser?.getIdToken() : null;
        const llmProfile = await getUserLlmProfile(user.uid);
        if (!token || !llmProfile?.apiKey) return;

        const res = await fetch("/api/articles/illustration-suggestions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contentLanguage: article.contentLanguage,
            hook: article.hook,
            body: article.body,
            ps: article.ps,
            scope: article.scope,
            llm: {
              provider: llmProfile.provider,
              apiKey: llmProfile.apiKey,
              model: llmProfile.model,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.illustration) {
          if (!opts?.quiet) setError(tIll("loadFailed"));
          return;
        }
        await saveArticleIllustration(user.uid, article.id, data.illustration);
        setIllustration(data.illustration);
        setArticle((prev) =>
          prev ? { ...prev, illustration: data.illustration } : prev,
        );
      } catch {
        if (!opts?.quiet) setError(tIll("loadFailed"));
      } finally {
        setIllustrationLoading(false);
      }
    },
    [user, article, tIll],
  );

  const load = useCallback(async () => {
    if (!user) return;
    const [a, p] = await Promise.all([
      getArticle(user.uid, articleId),
      getPersona(user.uid),
    ]);
    setArticle(
      a
        ? {
            ...a,
            refinement: mergeRefinementWithDefaults(a.refinement),
          }
        : null,
    );
    setPersonaText(p?.promptText ?? "");
    if (a?.selectedCtaStyle) setSelectedCtaStyle(a.selectedCtaStyle);
    setIllustration(a?.illustration ?? null);
    setQualityScores(a?.qualityScores ?? null);
    setAlternativeHooks(a?.alternativeHooks ?? []);
    setQualityCritique(a?.qualityCritique ?? null);
    setLoaded(true);
  }, [user, articleId]);

  useEffect(() => {
    if (authLoading) return;
    load().catch(() => setLoaded(true));
  }, [authLoading, load]);

  const ctaFetchedRef = useRef(false);
  const illustrationFetchedRef = useRef(false);
  const refinementSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refinementSyncGenRef = useRef(0);
  const refineSectionRef = useRef<HTMLDivElement>(null);
  const ctaSectionRef = useRef<HTMLDivElement>(null);

  const scrollToRefineSection = useCallback(() => {
    refineSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToCtaSection = useCallback(() => {
    ctaSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  function getMergedRefinement(): ArticleRefinement | null {
    if (!article) return null;
    return mergeRefinementWithDefaults(article.refinement);
  }
  useEffect(() => {
    ctaFetchedRef.current = false;
    illustrationFetchedRef.current = false;
  }, [articleId]);

  useEffect(() => {
    if (
      !loaded ||
      !article ||
      article.status === "validated" ||
      !personaText ||
      ctaFetchedRef.current
    ) {
      return;
    }
    ctaFetchedRef.current = true;
    loadCtaSuggestions();
  }, [loaded, article, personaText, loadCtaSuggestions]);

  useEffect(() => {
    if (!loaded || !article) return;
    if (article.illustration) {
      setIllustration(article.illustration);
      return;
    }
    if (illustrationFetchedRef.current) return;
    illustrationFetchedRef.current = true;
    loadIllustrationSuggestions();
  }, [loaded, article, loadIllustrationSuggestions]);

  useEffect(() => {
    if (!user || !article?.refinement || article.status === "validated") return;
    if (!hasReviseInput(article.refinement)) return;

    if (refinementSyncTimerRef.current) {
      clearTimeout(refinementSyncTimerRef.current);
    }
    const gen = ++refinementSyncGenRef.current;
    refinementSyncTimerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const status = article.status === "draft" ? "draft" : "refining";
          await persistArticleRefinementAndSyncPersona(
            user.uid,
            article.id,
            article.refinement!,
            article.contentLanguage,
            status,
          );
          if (gen !== refinementSyncGenRef.current) return;
          const p = await getPersona(user.uid);
          if (p?.promptText) setPersonaText(p.promptText);
        } catch {
          /* debounced sync — ignore transient errors */
        }
      })();
    }, 800);

    return () => {
      if (refinementSyncTimerRef.current) {
        clearTimeout(refinementSyncTimerRef.current);
      }
    };
  }, [user, article?.id, article?.refinement, article?.status, article?.contentLanguage]);

  function updateRefinement(patch: Partial<ArticleRefinement>) {
    if (!article) return;
    const base = mergeRefinementWithDefaults(article.refinement);
    setArticle({
      ...article,
      refinement: { ...base, ...patch },
    });
  }

  function setQuestionAnswer(
    qId: string,
    patch: { answer?: RefinementAnswer; comment?: string },
  ) {
    if (!article) return;
    const refinement = mergeRefinementWithDefaults(article.refinement);
    const questions = refinement.questions.map((q) => {
      if (q.id !== qId) return q;
      const next = { ...q };
      if ("answer" in patch) {
        next.answer = patch.answer;
      }
      if ("comment" in patch) {
        const raw = patch.comment;
        next.comment = raw === undefined || raw === "" ? undefined : raw;
      }
      return next;
    });
    updateRefinement({ questions });
  }

  const loadQualityAnalysis = useCallback(async () => {
    if (!user || !article) return;
    if (!personaText.trim()) {
      setError(tArticles("needPersona"));
      return;
    }
    setQualityLoading(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const llmProfile = await getUserLlmProfile(user.uid);
      if (!token || !llmProfile?.apiKey) {
        setError(tArticles("noLlmKey"));
        return;
      }

      const res = await fetch("/api/articles/quality", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentLanguage: article.contentLanguage,
          hook: article.hook,
          body: article.body,
          ps: article.ps,
          postBrief: article.postBrief,
          personaPromptText: personaText,
          llm: {
            provider: llmProfile.provider,
            apiKey: llmProfile.apiKey,
            model: llmProfile.model,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(tQuality("loadFailed"));
        return;
      }
      const scores = data.scores as ArticleQualityScores;
      const hooks = (data.alternativeHooks ?? []) as string[];
      const critique = typeof data.critique === "string" ? data.critique : "";
      await saveArticleQuality(user.uid, article.id, {
        qualityScores: scores,
        alternativeHooks: hooks,
        qualityCritique: critique,
      });
      setQualityScores(scores);
      setAlternativeHooks(hooks);
      setQualityCritique(critique || null);
      setArticle((prev) =>
        prev
          ? {
              ...prev,
              qualityScores: scores,
              alternativeHooks: hooks,
              qualityCritique: critique || undefined,
            }
          : prev,
      );
    } catch {
      setError(tQuality("loadFailed"));
    } finally {
      setQualityLoading(false);
    }
  }, [user, article, personaText, tQuality, tArticles]);

  function setReviseError(message: string) {
    setError(message);
    setErrorScope("refine");
    scrollToRefineSection();
  }

  function setValidateError(message: string) {
    setError(message);
    setErrorScope("cta");
    scrollToCtaSection();
  }

  function clearActionError() {
    setError(null);
    setErrorScope(null);
  }

  async function runRevise(refinement: ArticleRefinement) {
    if (!user || !article) return;
    if (!hasReviseInput(refinement)) {
      setReviseError(t("needRefinement"));
      return;
    }
    if (!personaText.trim()) {
      setReviseError(tArticles("needPersona"));
      return;
    }
    setPendingAction("revise");
    clearActionError();
    try {
      await saveArticleRefinement(user.uid, article.id, refinement, "refining");

      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const llmProfile = await getUserLlmProfile(user.uid);
      if (!token || !llmProfile?.apiKey) {
        setReviseError(tArticles("noLlmKey"));
        return;
      }

      const res = await fetch("/api/articles/revise", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personaPromptText: personaText,
          contentLanguage: article.contentLanguage,
          article: {
            hook: article.hook,
            body: article.body,
            ps: article.ps,
            scope: article.scope,
            hashtags: article.hashtags,
          },
          refinement,
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
        hook?: string;
        body?: string;
        ps?: string;
        scope?: string;
        hashtags?: string[];
      };
      if (!res.ok) {
        const detail = String(data.detail ?? data.error ?? "");
        if (data.error === "no_llm_key") {
          setReviseError(tArticles("noLlmKey"));
        } else if (isInvalidApiKeyError(detail)) {
          setReviseError(tArticles("invalidApiKey"));
        } else {
          setReviseError(t("reviseFailed"));
        }
        return;
      }

      if (!data.body?.trim()) {
        setReviseError(t("reviseFailed"));
        return;
      }

      await updateArticleContent(user.uid, article.id, {
        hook: data.hook?.trim() ?? article.hook,
        body: data.body.trim(),
        ps: data.ps?.trim() || undefined,
        scope: (data.scope as ArticleScope | undefined) ?? article.scope,
        hashtags: Array.isArray(data.hashtags) ? data.hashtags : article.hashtags,
      });
      await markArticleRegenerated(user.uid, article.id, refinement);
      await recordArticleRefinementFeedback(
        user.uid,
        article.id,
        refinement,
        article.contentLanguage,
      );
      const p = await getPersona(user.uid);
      if (p?.promptText) setPersonaText(p.promptText);
      illustrationFetchedRef.current = false;
      await load();
      void loadIllustrationSuggestions(true, { quiet: true });
    } catch {
      setReviseError(t("reviseFailed"));
    } finally {
      setPendingAction(null);
    }
  }

  async function onApplyFeedback() {
    const refinement = getMergedRefinement();
    if (!refinement) return;
    await runRevise(refinement);
  }

  async function onReviseIntent(intent: ReviseIntent) {
    if (!article) return;
    const refinement: ArticleRefinement = {
      ...mergeRefinementWithDefaults(article.refinement),
      globalComment: getReviseIntentPrompt(intent, article.contentLanguage),
    };
    setArticle({ ...article, refinement });
    await runRevise(refinement);
  }

  async function onApplyHook(hook: string) {
    if (!user || !article) return;
    await updateArticleContent(user.uid, article.id, {
      hook,
      body: article.body,
      ps: article.ps,
      scope: article.scope,
      hashtags: article.hashtags,
    });
    setArticle({ ...article, hook });
  }

  async function onValidate() {
    if (!user || !article) return;
    const refinement = getMergedRefinement();
    if (!refinement || !hasReviseInput(refinement)) {
      setValidateError(t("needRefinement"));
      return;
    }
    const chosen = ctaSuggestions.find((s) => s.style === selectedCtaStyle);
    if (!chosen) {
      setValidateError(tCta("pickOne"));
      return;
    }
    if (!personaText.trim()) {
      setValidateError(tArticles("needPersona"));
      return;
    }
    setPendingAction("validate");
    clearActionError();
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const [enrichment, llmProfile] = await Promise.all([
        getProfileEnrichment(user.uid),
        getUserLlmProfile(user.uid),
      ]);
      if (!token) {
        setValidateError(t("validateFailed"));
        return;
      }

      let hashtags = article.hashtags ?? [];
      if (llmProfile?.apiKey) {
        const tagRes = await fetch("/api/articles/hashtags", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personaPromptText: personaText,
            contentLanguage: article.contentLanguage,
            hook: article.hook,
            body: article.body,
            ps: article.ps,
            ctaText: chosen.text,
            profileEnrichment: enrichment?.details ?? {},
            llm: {
              provider: llmProfile.provider,
              apiKey: llmProfile.apiKey,
              model: llmProfile.model,
            },
          }),
        });
        const tagData = (await tagRes.json()) as {
          hashtags?: string[];
          error?: string;
          detail?: string;
        };
        if (tagRes.ok && tagData.hashtags?.length) {
          hashtags = tagData.hashtags;
        } else if (!tagRes.ok) {
          const detail = String(tagData.detail ?? tagData.error ?? "");
          if (tagData.error === "no_llm_key" || !llmProfile.apiKey) {
            setValidateError(tArticles("noLlmKey"));
            return;
          }
          if (isInvalidApiKeyError(detail)) {
            setValidateError(tArticles("invalidApiKey"));
            return;
          }
          /* Hashtags optionnels : on valide quand même avec les tags existants */
        }
      }

      const exportText = buildExportText(
        article.body,
        article.ps,
        chosen.text,
        chosen.linkUrl,
        hashtags,
      );
      await validateArticleWithCta(
        user.uid,
        article.id,
        exportText,
        {
          style: chosen.style,
          text: chosen.text,
          linkUrl: chosen.linkUrl,
        },
        hashtags,
      );
      try {
        await recordArticleValidateFeedback(
          user.uid,
          article.id,
          refinement,
          article.contentLanguage,
          chosen.style,
        );
      } catch {
        /* La validation LinkedIn ne doit pas échouer si la sync Persona rate */
      }
      clearActionError();
      await load();
    } catch {
      setValidateError(t("validateFailed"));
    } finally {
      setPendingAction(null);
    }
  }

  async function onCopyToLinkedIn() {
    if (!article?.exportText) return;
    const ok = await copyAndOpenLinkedInComposer(article.exportText);
    if (!ok) {
      setError(t("copyFailed"));
      return;
    }
    setError(null);
    setCopied(true);
    setTimeout(() => setCopied(false), 4000);
  }

  if (!loaded) {
    return <GeneratingIndicator label="…" className="max-w-xl" />;
  }

  if (!article) {
    return (
      <p className="text-sm text-ns-secondary">
        {t("notFound")}{" "}
        <Link href="/articles" className="underline">
          {t("back")}
        </Link>
      </p>
    );
  }

  const isValidated = article.status === "validated";
  const isRevising = pendingAction === "revise";
  const isValidating = pendingAction === "validate";
  const isBusy = pendingAction !== null;
  const mergedRefinement = getMergedRefinement();
  const canApplyFeedback = mergedRefinement
    ? hasReviseInput(mergedRefinement)
    : false;
  const hasBodyLink =
    bodyContainsExternalLink(article.body) ||
    (article.ps ? bodyContainsExternalLink(article.ps) : false);

  return (
    <div className="space-y-6">
      <Link href="/articles" className="text-sm text-ns-secondary hover:text-ns-tertiary">
        ← {t("back")}
      </Link>

      {article.newsSource && (
        <div className="rounded-lg border border-sky-200/80 bg-sky-50/80 px-4 py-3 text-sm">
          <p className="font-medium text-ns-tertiary">{t("newsAnchor")}</p>
          <p className="mt-1 text-ns-secondary">{article.newsSource.title}</p>
          <a
            href={article.newsSource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs font-medium text-sky-800 underline"
          >
            {t("readSource")}
          </a>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-ns-surface p-5">
        <p className="text-lg font-semibold text-ns-tertiary whitespace-pre-wrap">
          {article.hook}
        </p>
        <p className="mt-4 text-sm text-ns-tertiary whitespace-pre-wrap leading-relaxed">
          {article.body}
        </p>
        {article.ps && (
          <p className="mt-4 text-sm text-ns-secondary whitespace-pre-wrap">{article.ps}</p>
        )}
        {article.hashtags && article.hashtags.length > 0 && (
          <p className="mt-4 text-sm font-medium text-sky-800">
            {formatHashtagsLine(article.hashtags)}
          </p>
        )}
        {!isValidated && (
          <p className="mt-3 text-xs text-ns-secondary">{t("hashtagsHint")}</p>
        )}
      </div>

      {hasBodyLink && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {tQuality("linkWarning")}
        </div>
      )}

      {!isValidated && (
        <ArticleQualityPanel
          article={article}
          scores={qualityScores}
          alternativeHooks={alternativeHooks}
          critique={qualityCritique}
          loading={qualityLoading}
          onAnalyze={loadQualityAnalysis}
          onApplyHook={onApplyHook}
          onReviseIntent={onReviseIntent}
          revising={isRevising}
        />
      )}

      <ArticleSlopPanel
        article={article}
        disabled={isBusy}
        onSave={async (slop) => {
          if (!user) return;
          await saveArticleSlopAnalysis(user.uid, article.id, slop);
          setArticle((prev) => (prev ? { ...prev, slopAnalysis: slop } : prev));
        }}
      />

      <ArticleFormatPanel
        article={article}
        personaText={personaText}
        disabled={isBusy}
        onUpdated={(patch) => setArticle((prev) => (prev ? { ...prev, ...patch } : prev))}
      />

      <ArticleShareActions article={article} />

      <ArticleIllustrationPanel
        illustration={illustration}
        loading={illustrationLoading}
        regenerateDisabled={isBusy}
        onRegenerate={() => loadIllustrationSuggestions(true)}
      />

      {!isValidated && article.refinement && (
        <div
          ref={refineSectionRef}
          className="rounded-xl border border-gray-100 bg-ns-brand-light p-5 space-y-5"
        >
          <h2 className="text-base font-semibold text-ns-tertiary">{tRef("title")}</h2>
          {error && errorScope === "refine" && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{error}</p>
              {error === t("reviseFailed") && (
                <p className="mt-1 text-xs font-normal">{t("reviseFailedHint")}</p>
              )}
              {(error === tArticles("noLlmKey") ||
                error === tArticles("invalidApiKey") ||
                error === tArticles("needPersona")) && (
                <p className="mt-2">
                  <Link
                    href={
                      error === tArticles("needPersona") ? "/persona" : "/setup/llm"
                    }
                    className="font-medium underline"
                  >
                    →{" "}
                    {error === tArticles("needPersona")
                      ? tArticles("goPersona")
                      : tArticles("goLlmSetup")}
                  </Link>
                </p>
              )}
            </div>
          )}
          {article.refinement.questions.map((q) => {
            const yesNoOnly = YES_NO_ONLY_QUESTIONS.has(q.id);
            const answerOptions: RefinementAnswer[] = yesNoOnly
              ? ["yes", "no"]
              : ["yes", "no", "partial"];
            const questionLabel =
              q.id === "currentNews"
                ? tRef("currentNews")
                : q.id === "tone"
                  ? tRef("tone")
                  : q.id === "theme"
                    ? tRef("theme")
                    : q.id === "length"
                      ? tRef("length")
                      : tRef("hook");

            return (
              <div key={q.id} className="space-y-2">
                <p className="text-sm font-medium text-ns-tertiary">{questionLabel}</p>
                <div className="flex flex-wrap gap-2">
                  {answerOptions.map((ans) => (
                    <button
                      key={ans}
                      type="button"
                      onClick={() => {
                        if (yesNoOnly && ans === "no") {
                          setQuestionAnswer(q.id, {
                            answer: ans,
                            comment: undefined,
                          });
                        } else {
                          setQuestionAnswer(q.id, { answer: ans });
                        }
                      }}
                      className={
                        q.answer === ans
                          ? "rounded-sm bg-ns-tertiary px-3 py-1.5 text-xs font-black uppercase text-ns-primary"
                          : "rounded-lg border border-ns-alternate px-3 py-1.5 text-xs text-ns-tertiary"
                      }
                    >
                      {ans === "yes"
                        ? tRef("answers.yes")
                        : ans === "no"
                          ? tRef("answers.no")
                          : tRef("answers.partial")}
                    </button>
                  ))}
                </div>
                {(!yesNoOnly || q.answer === "yes") && (
                  <input
                    type="text"
                    value={q.comment ?? ""}
                    onChange={(e) =>
                      setQuestionAnswer(q.id, { comment: e.target.value })
                    }
                    placeholder={
                      q.id === "currentNews"
                        ? tRef("currentNewsDetailPlaceholder")
                        : tRef("commentPlaceholder")
                    }
                    disabled={yesNoOnly && q.answer !== "yes"}
                    className={INPUT_CLASS}
                  />
                )}
              </div>
            );
          })}
          <ToneEdgePicker
            value={(article.refinement.toneEdge ?? "default") as ToneEdge}
            onChange={(toneEdge) => updateRefinement({ toneEdge })}
          />
          <EmojiLevelPicker
            variant="compact"
            value={(article.refinement.emojiLevel ?? "light") as EmojiLevel}
            onChange={(emojiLevel) => updateRefinement({ emojiLevel })}
          />
          {(article.refinement.toneEdge ?? "default") === "corrosive" && (
            <button
              type="button"
              disabled={isBusy}
              onClick={onApplyFeedback}
              className="w-full rounded-lg border border-ns-tertiary/30 bg-white px-4 py-2.5 text-sm font-medium text-ns-tertiary hover:bg-ns-brand-light disabled:opacity-50 sm:w-auto"
            >
              {isRevising ? tRef("toneEdgeApplying") : tRef("toneEdgeApply")}
            </button>
          )}
          <div>
            <label className={LABEL_CLASS}>{tRef("globalComment")}</label>
            <textarea
              rows={3}
              value={article.refinement.globalComment ?? ""}
              onChange={(e) => updateRefinement({ globalComment: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
          {isRevising && (
            <GeneratingIndicator
              label={t("revising")}
              hint={t("revisingHint")}
              className="max-w-xl"
            />
          )}
          <button
            type="button"
            disabled={isBusy || (!canApplyFeedback && !isRevising)}
            onClick={() => void onApplyFeedback()}
            className="inline-flex items-center gap-2 rounded-lg border border-ns-alternate bg-white px-4 py-2.5 text-sm font-semibold text-ns-tertiary hover:bg-ns-brand-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRevising && (
              <ButtonSpinner className="border-ns-alternate border-t-zinc-800" />
            )}
            {isRevising ? t("revising") : t("applyFeedback")}
          </button>
          {!canApplyFeedback && !isRevising && (
            <p className="text-xs text-ns-secondary">{t("needRefinement")}</p>
          )}
        </div>
      )}

      {!isValidated && (
        <div
          ref={ctaSectionRef}
          className="rounded-xl border border-gray-100 p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-ns-tertiary">{tCta("title")}</h2>
            <button
              type="button"
              disabled={ctaLoading || isBusy}
              onClick={loadCtaSuggestions}
              className="text-sm text-ns-secondary underline hover:text-ns-tertiary"
            >
              {ctaLoading ? "…" : tCta("regenerate")}
            </button>
          </div>
          <p className="text-sm text-ns-secondary">{tCta("subtitle")}</p>

          {ctaLoading && (
            <GeneratingIndicator label={tCta("loading")} className="max-w-md" />
          )}

          {!ctaLoading && ctaSuggestions.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-3">
              {ctaSuggestions.map((s) => (
                <li key={s.style}>
                  <button
                    type="button"
                    onClick={() => setSelectedCtaStyle(s.style)}
                    className={
                      selectedCtaStyle === s.style
                        ? "h-full w-full rounded-xl border-2 border-zinc-900 bg-ns-brand-light p-4 text-left"
                        : "h-full w-full rounded-2xl border border-gray-100 bg-ns-surface p-4 text-left hover:border-ns-primary"
                    }
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-ns-secondary">
                      {tCta(`styles.${s.style}`)}
                    </p>
                    <p className="mt-2 text-sm text-ns-tertiary whitespace-pre-wrap">
                      {s.text}
                    </p>
                    {s.linkUrl && (
                      <p className="mt-2 truncate text-xs text-ns-secondary">{s.linkUrl}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {isValidating && (
            <GeneratingIndicator
              label={t("validating")}
              hint={t("validatingHint")}
              className="max-w-xl"
            />
          )}

          <button
            type="button"
            disabled={isBusy || ctaLoading || !selectedCtaStyle}
            onClick={() => void onValidate()}
            className="inline-flex items-center gap-2 rounded-sm bg-ns-primary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-sm hover:bg-ns-primary/90 disabled:opacity-50"
          >
            {isValidating && <ButtonSpinner />}
            {isValidating ? t("validating") : t("validate")}
          </button>
          {error && errorScope === "cta" && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{error}</p>
              {error === t("validateFailed") && (
                <p className="mt-1 text-xs font-normal">{t("validateFailedHint")}</p>
              )}
              {(error === tArticles("noLlmKey") ||
                error === tArticles("invalidApiKey") ||
                error === tArticles("needPersona")) && (
                <p className="mt-2">
                  <Link
                    href={
                      error === tArticles("needPersona") ? "/persona" : "/setup/llm"
                    }
                    className="font-medium underline"
                  >
                    →{" "}
                    {error === tArticles("needPersona")
                      ? tArticles("goPersona")
                      : tArticles("goLlmSetup")}
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {isValidated && article.exportText && (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-sm font-medium text-ns-tertiary">{t("exportPreview")}</h2>
            <LinkedInCharCount text={article.exportText} />
          </div>
          <pre className="whitespace-pre-wrap rounded-xl border border-gray-100 bg-ns-brand-light p-4 text-sm text-ns-tertiary">
            {article.exportText}
          </pre>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onCopyToLinkedIn}
              className="rounded-sm bg-ns-primary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-sm hover:bg-ns-primary/90"
            >
              {copied ? t("copied") : t("copyLinkedIn")}
            </button>
          </div>
          <p className="text-xs font-medium leading-relaxed text-ns-secondary">
            {t("copyLinkedInHint")}
          </p>
        </div>
      )}

      {isValidated && user && (
        <ArticlePerformancePanel
          article={article}
          disabled={isBusy}
          onSave={async (signals) => {
            await saveArticlePerformanceSignals(user.uid, article.id, signals);
            setArticle((prev) => (prev ? { ...prev, performanceSignals: signals } : prev));
          }}
        />
      )}

      {error && isValidated && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
