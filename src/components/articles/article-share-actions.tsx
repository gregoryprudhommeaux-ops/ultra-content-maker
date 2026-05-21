"use client";

import {
  getShareAttributionLine,
  getShareEmailSubjectTemplate,
} from "@/lib/articles/share-attribution";
import {
  buildFullShareText,
  buildMailtoHref,
  buildShareEmailSubject,
  buildWhatsAppHref,
} from "@/lib/articles/share";
import { BTN_SECONDARY } from "@/lib/ui/nextstep";
import type { ArticleDoc } from "@/types/workspace";
import { useTranslations } from "next-intl";

type ArticleShareActionsProps = {
  article: ArticleDoc;
};

export function ArticleShareActions({ article }: ArticleShareActionsProps) {
  const t = useTranslations("setup.articles.share");

  const attributionLine = getShareAttributionLine(article.contentLanguage);
  const shareText = buildFullShareText(article, attributionLine);
  const emailSubject = buildShareEmailSubject(
    getShareEmailSubjectTemplate(article.contentLanguage),
    article,
  );
  const mailtoHref = buildMailtoHref(emailSubject, shareText);
  const whatsappHref = buildWhatsAppHref(shareText);

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
        <a href={mailtoHref} className={BTN_SECONDARY}>
          {t("email")}
        </a>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={BTN_SECONDARY}
        >
          {t("whatsapp")}
        </a>
      </div>
    </div>
  );
}
