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
import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/contexts/workspace-context";
import { getClientAuth } from "@/lib/firebase/client";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { BTN_SECONDARY } from "@/lib/ui/nextstep";
import type { ArticleDoc } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useState } from "react";

type ArticleShareActionsProps = {
  article: ArticleDoc;
};

export function ArticleShareActions({ article }: ArticleShareActionsProps) {
  const t = useTranslations("setup.articles.share");
  const { user } = useAuth();
  const { scope, activeAccount } = useWorkspace();
  const isPlatformAdmin = usePlatformAdmin();
  const [adminLinkStatus, setAdminLinkStatus] = useState<"idle" | "loading" | "error">("idle");

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

  async function onAdminFeedbackEmail() {
    if (!user || !scope?.ownerId || !article.id) return;
    setAdminLinkStatus("loading");
    try {
      const auth = getClientAuth();
      const token = await auth?.currentUser?.getIdToken();
      if (!token) throw new Error("auth");

      const linkLocale = contentLanguageToInviteLocale(article.contentLanguage);
      const res = await fetch(
        `/api/admin/articles/${encodeURIComponent(article.id)}/draft-review-link`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ownerId: scope.ownerId,
            accountId: scope.accountId,
            locale: linkLocale,
          }),
        },
      );
      if (!res.ok) throw new Error("api");
      const data = (await res.json()) as { url: string };
      const hookPreview = article.hook?.trim().split("\n")[0] ?? "";
      const { subject, body } = buildFeedbackInviteEmail(
        article.contentLanguage,
        data.url,
        hookPreview,
      );
      const clientEmail = activeAccount?.managedClientEmail?.trim();
      openMailtoHref(buildMailtoHref(subject, body, clientEmail));
      setAdminLinkStatus("idle");
    } catch {
      setAdminLinkStatus("error");
      window.setTimeout(() => setAdminLinkStatus("idle"), 4000);
    }
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-ns-brand-light p-5 space-y-3">
      <div>
        <h2 className="text-xs font-black uppercase tracking-widest text-ns-tertiary">
          {t("title")}
        </h2>
        <p className="mt-1 text-xs font-medium leading-relaxed text-ns-secondary">
          {t("hint")}
        </p>
      </div>
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
          <button
            type="button"
            disabled={adminLinkStatus === "loading"}
            onClick={() => void onAdminFeedbackEmail()}
            className={`${BTN_SECONDARY} border-violet-300 text-violet-900 hover:bg-violet-50 disabled:opacity-50`}
          >
            {adminLinkStatus === "loading"
              ? t("adminFeedbackLoading")
              : adminLinkStatus === "error"
                ? t("adminFeedbackError")
                : t("adminFeedbackLink")}
          </button>
        )}
      </div>
      {showAdminFeedbackLink && (
        <p className="text-xs text-ns-secondary">{t("adminFeedbackHint")}</p>
      )}
    </div>
  );
}
