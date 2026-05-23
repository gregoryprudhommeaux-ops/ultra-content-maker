"use client";

import type { ArticleDoc, ArticleRepurpose, PostFormatPlan } from "@/types/workspace";
import { getClientAuth } from "@/lib/firebase/client";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import {
  saveArticleFormatPlan,
  saveArticleRepurpose,
  saveSuggestedFirstComment,
} from "@/lib/workspace/articles";
import { useAuth } from "@/components/auth/auth-provider";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  article: ArticleDoc;
  personaText: string;
  disabled?: boolean;
  onUpdated: (patch: Partial<ArticleDoc>) => void;
};

export function ArticleFormatPanel({
  article,
  personaText,
  disabled,
  onUpdated,
}: Props) {
  const t = useTranslations("setup.articles.format");
  const { user } = useAuth();
  const [formatPlan, setFormatPlan] = useState<PostFormatPlan | null>(
    article.postFormatPlan ?? null,
  );
  const [repurpose, setRepurpose] = useState<ArticleRepurpose | null>(
    article.repurpose ?? null,
  );
  const [firstComment, setFirstComment] = useState(
    article.suggestedFirstComment ?? "",
  );
  const [loadingFormat, setLoadingFormat] = useState(false);
  const [loadingRepurpose, setLoadingRepurpose] = useState(false);
  const [loadingComment, setLoadingComment] = useState(false);
  const [copied, setCopied] = useState<"comment" | "carousel" | null>(null);
  const autoCommentForArticleRef = useRef<string | null>(null);

  useEffect(() => {
    setFormatPlan(article.postFormatPlan ?? null);
    setRepurpose(article.repurpose ?? null);
    setFirstComment(article.suggestedFirstComment ?? "");
  }, [
    article.id,
    article.postFormatPlan,
    article.repurpose,
    article.suggestedFirstComment,
  ]);

  const llmPayload = useCallback(async () => {
    const auth = getClientAuth();
    const token = auth ? await auth.currentUser?.getIdToken() : null;
    const llmProfile = user ? await getUserLlmProfile(user.uid) : null;
    if (!token || !llmProfile?.apiKey) return null;
    return {
      token,
      llm: {
        provider: llmProfile.provider,
        apiKey: llmProfile.apiKey,
        model: llmProfile.model,
      },
    };
  }, [user]);

  async function loadFormatPlan() {
    if (!user) return;
    setLoadingFormat(true);
    try {
      const auth = await llmPayload();
      if (!auth) return;
      const res = await fetch("/api/articles/format-plan", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentLanguage: article.contentLanguage,
          hook: article.hook,
          body: article.body,
          ps: article.ps,
          postBrief: article.postBrief,
          personaPromptText: personaText,
          llm: auth.llm,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.plan) return;
      await saveArticleFormatPlan(user.uid, article.id, data.plan);
      setFormatPlan(data.plan);
      onUpdated({ postFormatPlan: data.plan });
    } finally {
      setLoadingFormat(false);
    }
  }

  async function loadRepurpose() {
    if (!user) return;
    setLoadingRepurpose(true);
    try {
      const auth = await llmPayload();
      if (!auth) return;
      const res = await fetch("/api/articles/repurpose", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentLanguage: article.contentLanguage,
          hook: article.hook,
          body: article.body,
          ps: article.ps,
          exportText: article.exportText,
          postBrief: article.postBrief,
          personaPromptText: personaText,
          llm: auth.llm,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.repurpose) return;
      await saveArticleRepurpose(user.uid, article.id, data.repurpose);
      setRepurpose(data.repurpose);
      onUpdated({ repurpose: data.repurpose });
    } finally {
      setLoadingRepurpose(false);
    }
  }

  async function loadFirstComment() {
    if (!user) return;
    setLoadingComment(true);
    try {
      const auth = await llmPayload();
      if (!auth) return;
      const res = await fetch("/api/articles/first-comment", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentLanguage: article.contentLanguage,
          hook: article.hook,
          body: article.body,
          exportText: article.exportText,
          postBrief: article.postBrief,
          personaPromptText: personaText,
          newsSource: article.newsSource,
          llm: auth.llm,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.comment) return;
      await saveSuggestedFirstComment(user.uid, article.id, data.comment);
      setFirstComment(data.comment);
      onUpdated({ suggestedFirstComment: data.comment });
    } finally {
      setLoadingComment(false);
    }
  }

  useEffect(() => {
    if (
      disabled ||
      !user ||
      !article.newsSource?.url ||
      article.status !== "validated" ||
      article.suggestedFirstComment?.trim() ||
      autoCommentForArticleRef.current === article.id
    ) {
      return;
    }
    autoCommentForArticleRef.current = article.id;
    void loadFirstComment();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per validated news article
  }, [
    article.id,
    article.status,
    article.newsSource?.url,
    article.suggestedFirstComment,
    disabled,
    user,
  ]);

  async function copyText(text: string, key: "comment" | "carousel") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      /* ignore */
    }
  }

  function formatCarouselText(r: ArticleRepurpose): string {
    if (!r.carousel) return "";
    return r.carousel.slides
      .map((s, i) => {
        const bullets = s.bullets.map((b) => `• ${b}`).join("\n");
        return `Slide ${i + 1}: ${s.title}\n${bullets}`;
      })
      .join("\n\n");
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5 space-y-6">
      <div>
        <h2 className="text-base font-semibold text-ns-tertiary">{t("title")}</h2>
        <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
      </div>

      <div className="space-y-3 border-b border-gray-100 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ns-tertiary">{t("formatTitle")}</h3>
          <button
            type="button"
            disabled={disabled || loadingFormat}
            onClick={loadFormatPlan}
            className="text-sm font-medium text-ns-tertiary underline hover:text-ns-primary disabled:opacity-50"
          >
            {loadingFormat ? "…" : formatPlan ? t("refreshFormat") : t("recommendFormat")}
          </button>
        </div>
        {formatPlan && (
          <div className="rounded-lg bg-ns-brand-light/50 p-3 text-sm">
            <p className="font-semibold text-ns-tertiary">
              {t(`formats.${formatPlan.primaryFormat}`)}
            </p>
            <p className="mt-2 text-ns-secondary">{formatPlan.rationale}</p>
            {formatPlan.alternativeFormats && formatPlan.alternativeFormats.length > 0 && (
              <p className="mt-2 text-xs text-ns-secondary">
                {t("alternatives")}:{" "}
                {formatPlan.alternativeFormats
                  .map((f) => t(`formats.${f}`))
                  .join(", ")}
              </p>
            )}
            {formatPlan.primaryFormat === "carousel" && (
              <p className="mt-2 text-xs text-amber-800">{t("carouselHint")}</p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3 border-b border-gray-100 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ns-tertiary">{t("repurposeTitle")}</h3>
          <button
            type="button"
            disabled={disabled || loadingRepurpose}
            onClick={loadRepurpose}
            className="text-sm font-medium text-ns-tertiary underline hover:text-ns-primary disabled:opacity-50"
          >
            {loadingRepurpose ? "…" : repurpose ? t("refreshRepurpose") : t("generateRepurpose")}
          </button>
        </div>
        <p className="text-xs text-ns-secondary">{t("repurposeHint")}</p>
        {repurpose?.carousel && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ns-secondary">
                {t("carouselOutline")}
              </p>
              <button
                type="button"
                onClick={() => copyText(formatCarouselText(repurpose), "carousel")}
                className="text-xs font-medium text-ns-primary underline"
              >
                {copied === "carousel" ? t("copied") : t("copyAll")}
              </button>
            </div>
            <ol className="space-y-2">
              {repurpose.carousel.slides.map((slide, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-gray-100 bg-ns-brand-light/30 p-3 text-sm"
                >
                  <p className="font-medium text-ns-tertiary">
                    {i + 1}. {slide.title}
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-ns-secondary">
                    {slide.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
            {repurpose.carousel.designNotes && (
              <p className="text-xs text-ns-secondary italic">
                {repurpose.carousel.designNotes}
              </p>
            )}
          </div>
        )}
        {repurpose?.videoScript && (
          <div className="rounded-lg border border-gray-100 p-3 text-sm space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ns-secondary">
              {t("videoScript")}
              {repurpose.videoScript.totalDurationSec
                ? ` (~${repurpose.videoScript.totalDurationSec}s)`
                : ""}
            </p>
            <p className="font-medium text-ns-tertiary">{repurpose.videoScript.hookLine}</p>
            {repurpose.videoScript.segments.map((seg, i) => (
              <div key={i}>
                <p className="text-xs font-medium text-ns-secondary">{seg.label}</p>
                <p className="text-ns-tertiary whitespace-pre-wrap">{seg.script}</p>
              </div>
            ))}
            <p className="text-ns-secondary italic">{repurpose.videoScript.closingLine}</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ns-tertiary">{t("firstCommentTitle")}</h3>
          <button
            type="button"
            disabled={disabled || loadingComment}
            onClick={loadFirstComment}
            className="text-sm font-medium text-ns-tertiary underline hover:text-ns-primary disabled:opacity-50"
          >
            {loadingComment ? "…" : firstComment ? t("refreshComment") : t("generateComment")}
          </button>
        </div>
        <p className="text-xs text-ns-secondary">
          {article.newsSource?.url ? t("firstCommentHintNews") : t("firstCommentHint")}
        </p>
        {firstComment && (
          <div className="rounded-lg bg-ns-brand-light/50 p-3">
            <p className="text-sm text-ns-tertiary whitespace-pre-wrap">{firstComment}</p>
            <button
              type="button"
              onClick={() => copyText(firstComment, "comment")}
              className="mt-2 text-xs font-medium text-ns-primary underline"
            >
              {copied === "comment" ? t("copied") : t("copyComment")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
