"use client";

import {
  getShareAttributionLine,
  getShareEmailSubjectTemplate,
} from "@/lib/articles/share-attribution";
import { buildFeedbackInviteEmail, contentLanguageToInviteLocale } from "@/lib/articles/share-feedback-invite";
import {
  buildFullShareText,
  buildMailtoHref,
  buildShareEmailSubject,
  buildWhatsAppHref,
  openMailtoHref,
} from "@/lib/articles/share";
import { createDraftReviewLink } from "@/lib/draft-review/create-review-link-client";
import {
  readStoredReviewUrl,
  writeStoredReviewUrl,
} from "@/lib/draft-review/review-link-storage";
import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/contexts/workspace-context";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui/nextstep";
import type { ArticleDoc } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type ArticleShareActionsProps = {
  article: ArticleDoc;
};

function resolveAdminLinkError(
  t: ReturnType<typeof useTranslations<"setup.articles.share">>,
  error: string,
): string {
  switch (error) {
    case "article_not_found":
      return t("adminFeedbackErrorNotFound");
    case "unauthorized":
    case "invalid_token":
      return t("adminFeedbackErrorAuth");
    case "forbidden":
      return t("adminFeedbackErrorForbidden");
    case "admin_not_configured":
      return t("adminFeedbackErrorServer");
    default:
      return t("adminFeedbackError");
  }
}

export function ArticleShareActions({ article }: ArticleShareActionsProps) {
  const t = useTranslations("setup.articles.share");
  const { user } = useAuth();
  const { scope, activeAccount } = useWorkspace();
  const isPlatformAdmin = usePlatformAdmin();
  const [generateStatus, setGenerateStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const attributionLine = getShareAttributionLine(article.contentLanguage);
  const shareText = buildFullShareText(article, attributionLine);
  const emailSubject = buildShareEmailSubject(
    getShareEmailSubjectTemplate(article.contentLanguage),
    article,
  );
  const mailtoHref = buildMailtoHref(emailSubject, shareText);
  const whatsappHref = buildWhatsAppHref(shareText);

  const showAdminFeedbackLink =
    isPlatformAdmin && user && scope?.ownerId && article.id;

  useEffect(() => {
    if (!article.id) return;
    const stored = readStoredReviewUrl(article.id);
    if (stored) setReviewUrl(stored);
  }, [article.id]);

  async function onGenerateReviewLink() {
    if (!scope?.ownerId || !article.id) return;
    setGenerateStatus("loading");
    setErrorMessage(null);
    setCopied(false);

    const result = await createDraftReviewLink({
      articleId: article.id,
      ownerId: scope.ownerId,
      accountId: scope.accountId,
      locale: contentLanguageToInviteLocale(article.contentLanguage),
    });

    if (!result.ok) {
      setGenerateStatus("error");
      setErrorMessage(resolveAdminLinkError(t, result.error));
      return;
    }

    setReviewUrl(result.url);
    writeStoredReviewUrl(article.id, result.url);
    setGenerateStatus("idle");

    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard optional */
    }
  }

  function onOpenReviewEmail() {
    if (!reviewUrl) return;
    const hookPreview = article.hook?.trim().split("\n")[0] ?? "";
    const { subject, body } = buildFeedbackInviteEmail(
      article.contentLanguage,
      reviewUrl,
      hookPreview,
    );
    const clientEmail = activeAccount?.managedClientEmail?.trim();
    openMailtoHref(buildMailtoHref(subject, body, clientEmail));
  }

  async function onCopyReviewLink() {
    if (!reviewUrl) return;
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => openMailtoHref(mailtoHref)}
          className={BTN_SECONDARY}
        >
          {t("email")}
        </button>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={BTN_SECONDARY}
        >
          {t("whatsapp")}
        </a>
        {showAdminFeedbackLink && (
          <>
            <button
              type="button"
              disabled={generateStatus === "loading"}
              onClick={() => void onGenerateReviewLink()}
              className={`${BTN_PRIMARY} disabled:opacity-50`}
            >
              {generateStatus === "loading"
                ? t("adminFeedbackLoading")
                : reviewUrl
                  ? t("adminFeedbackRegenerate")
                  : t("adminFeedbackGenerate")}
            </button>
            <button
              type="button"
              disabled={!reviewUrl}
              onClick={onOpenReviewEmail}
              className={`${BTN_SECONDARY} border-violet-300 text-violet-900 hover:bg-violet-50 disabled:opacity-50`}
            >
              {t("adminFeedbackEmail")}
            </button>
          </>
        )}
      </div>

      {showAdminFeedbackLink && errorMessage && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {errorMessage}
        </p>
      )}

      {showAdminFeedbackLink && reviewUrl && (
        <div className="rounded-lg border border-violet-200/70 bg-violet-50/40 px-3 py-3 space-y-2">
          <p className="text-xs font-semibold text-violet-950">{t("adminFeedbackLinkReady")}</p>
          <a
            href={reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block break-all text-sm font-medium text-violet-900 underline hover:text-violet-700"
          >
            {reviewUrl}
          </a>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void onCopyReviewLink()} className={BTN_SECONDARY}>
              {copied ? t("adminFeedbackCopied") : t("adminFeedbackCopyLink")}
            </button>
            <a
              href={reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={BTN_SECONDARY}
            >
              {t("adminFeedbackOpenPage")}
            </a>
          </div>
        </div>
      )}

      {showAdminFeedbackLink && (
        <p className="text-xs text-ns-secondary">{t("adminFeedbackHint")}</p>
      )}
    </div>
  );
}
