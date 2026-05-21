"use client";

import { EmojiLevelPicker } from "@/components/articles/emoji-level-picker";
import { LinkedInCharCount } from "@/components/articles/linkedin-char-count";
import {
  ButtonSpinner,
  GeneratingIndicator,
} from "@/components/ui/generating-indicator";
import { useAuth } from "@/components/auth/auth-provider";
import { getAuthorProfile } from "@/lib/workspace/author";
import { getProfileEnrichment } from "@/lib/workspace/enrichment";
import { getPersona } from "@/lib/workspace/persona";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import {
  mergeRefinementWithDefaults,
  YES_NO_ONLY_QUESTIONS,
} from "@/lib/articles/refinement";
import { formatHashtagsLine } from "@/lib/linkedin/hashtags";
import {
  buildExportText,
  getArticle,
  hasRefinementInput,
  markArticleRegenerated,
  saveArticleRefinement,
  updateArticleContent,
  validateArticleWithCta,
} from "@/lib/workspace/articles";
import {
  recordArticleRefinementFeedback,
  recordArticleValidateFeedback,
} from "@/lib/persona/sync-persona-from-feedback";
import { getClientAuth } from "@/lib/firebase/client";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type {
  ArticleDoc,
  ArticleRefinement,
  CtaIntensity,
  CtaSuggestion,
  EmojiLevel,
  RefinementAnswer,
} from "@/types/workspace";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = { articleId: string };

export function ArticleEditor({ articleId }: Props) {
  const t = useTranslations("setup.articles.detail");
  const tRef = useTranslations("setup.articles.refinement");
  const tCta = useTranslations("setup.articles.cta");
  const { user, loading: authLoading } = useAuth();
  const [article, setArticle] = useState<ArticleDoc | null>(null);
  const [personaText, setPersonaText] = useState("");
  const [ctaSuggestions, setCtaSuggestions] = useState<CtaSuggestion[]>([]);
  const [selectedCtaStyle, setSelectedCtaStyle] = useState<CtaIntensity | null>(
    null,
  );
  const [ctaLoading, setCtaLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<"revise" | "validate" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
            refinement: a.refinement
              ? mergeRefinementWithDefaults(a.refinement)
              : a.refinement,
          }
        : null,
    );
    setPersonaText(p?.promptText ?? "");
    if (a?.selectedCtaStyle) setSelectedCtaStyle(a.selectedCtaStyle);
    setLoaded(true);
  }, [user, articleId]);

  useEffect(() => {
    if (authLoading) return;
    load().catch(() => setLoaded(true));
  }, [authLoading, load]);

  const ctaFetchedRef = useRef(false);
  useEffect(() => {
    ctaFetchedRef.current = false;
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

  function updateRefinement(patch: Partial<ArticleRefinement>) {
    if (!article?.refinement) return;
    setArticle({
      ...article,
      refinement: { ...article.refinement, ...patch },
    });
  }

  function setQuestionAnswer(
    qId: string,
    patch: { answer?: RefinementAnswer; comment?: string },
  ) {
    if (!article?.refinement) return;
    const questions = article.refinement.questions.map((q) => {
      if (q.id !== qId) return q;
      const next = { ...q };
      if ("answer" in patch) {
        next.answer = patch.answer;
      }
      if ("comment" in patch) {
        next.comment = patch.comment?.trim() || undefined;
      }
      return next;
    });
    updateRefinement({ questions });
  }

  async function onApplyFeedback() {
    if (!user || !article?.refinement || !personaText) return;
    setPendingAction("revise");
    setError(null);
    try {
      await saveArticleRefinement(user.uid, article.id, article.refinement, "refining");

      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const [author, llmProfile] = await Promise.all([
        getAuthorProfile(user.uid),
        getUserLlmProfile(user.uid),
      ]);
      if (!token || !llmProfile?.apiKey) throw new Error("auth");

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
          refinement: article.refinement,
          llm: {
            provider: llmProfile.provider,
            apiKey: llmProfile.apiKey,
            model: llmProfile.model,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(t("reviseFailed"));
        return;
      }

      await updateArticleContent(user.uid, article.id, data);
      await markArticleRegenerated(user.uid, article.id, article.refinement);
      await recordArticleRefinementFeedback(
        user.uid,
        article.refinement,
        article.contentLanguage,
      );
      const p = await getPersona(user.uid);
      if (p?.promptText) setPersonaText(p.promptText);
      await load();
    } catch {
      setError(t("reviseFailed"));
    } finally {
      setPendingAction(null);
    }
  }

  async function onValidate() {
    if (!user || !article) return;
    if (!article.refinement || !hasRefinementInput(article.refinement)) {
      setError(t("needRefinement"));
      return;
    }
    const chosen = ctaSuggestions.find((s) => s.style === selectedCtaStyle);
    if (!chosen) {
      setError(tCta("pickOne"));
      return;
    }
    setPendingAction("validate");
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const [enrichment, llmProfile] = await Promise.all([
        getProfileEnrichment(user.uid),
        getUserLlmProfile(user.uid),
      ]);
      if (!token || !llmProfile?.apiKey) throw new Error("auth");

      let hashtags = article.hashtags ?? [];
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
      const tagData = await tagRes.json();
      if (tagRes.ok && tagData.hashtags?.length) {
        hashtags = tagData.hashtags;
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
      if (article.refinement) {
        await recordArticleValidateFeedback(
          user.uid,
          article.refinement,
          article.contentLanguage,
          chosen.style,
        );
      }
      await load();
    } catch {
      setError(t("validateFailed"));
    } finally {
      setPendingAction(null);
    }
  }

  async function onCopy() {
    if (!article?.exportText) return;
    await navigator.clipboard.writeText(article.exportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  return (
    <div className="space-y-6">
      <Link href="/articles" className="text-sm text-ns-secondary hover:text-ns-tertiary">
        ← {t("back")}
      </Link>

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

      {!isValidated && article.refinement && (
        <div className="rounded-xl border border-gray-100 bg-ns-brand-light p-5 space-y-5">
          <h2 className="text-base font-semibold text-ns-tertiary">{tRef("title")}</h2>
          <EmojiLevelPicker
            value={(article.refinement.emojiLevel ?? "light") as EmojiLevel}
            onChange={(emojiLevel) => updateRefinement({ emojiLevel })}
          />
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
            disabled={isBusy}
            onClick={onApplyFeedback}
            className="inline-flex items-center gap-2 rounded-lg border border-ns-alternate px-4 py-2 text-sm font-medium hover:bg-white disabled:opacity-50"
          >
            {isRevising && (
              <ButtonSpinner className="border-ns-alternate border-t-zinc-800" />
            )}
            {isRevising ? t("revising") : t("applyFeedback")}
          </button>
        </div>
      )}

      {!isValidated && (
        <div className="rounded-xl border border-gray-100 p-5 space-y-4">
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
            onClick={onValidate}
            className="inline-flex items-center gap-2 rounded-sm bg-ns-primary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-sm hover:bg-ns-primary/90 disabled:opacity-50"
          >
            {isValidating && <ButtonSpinner />}
            {isValidating ? t("validating") : t("validate")}
          </button>
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
          <button
            type="button"
            onClick={onCopy}
            className="rounded-sm bg-ns-primary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-sm hover:bg-ns-primary/90"
          >
            {copied ? t("copied") : t("copyLinkedIn")}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
