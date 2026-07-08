"use client";

import { inferArticleCreationMode } from "@/lib/articles/infer-creation-mode";
import { resolveArticleScope } from "@/lib/articles/scope";
import { CARD_SOFT } from "@/lib/ui/nextstep";
import { Link } from "@/i18n/navigation";
import type { ArticleDoc, ContentLanguage } from "@/types/workspace";
import { useLocale, useTranslations } from "next-intl";

type Props = {
  articles: ArticleDoc[];
};

function formatValidatedDate(date: Date | undefined, locale: ContentLanguage): string {
  if (!date) return "—";
  const tag = locale === "en" ? "en-US" : locale === "es" ? "es-MX" : "fr-FR";
  return new Intl.DateTimeFormat(tag, { dateStyle: "medium" }).format(date);
}

export function DashboardValidatedTable({ articles }: Props) {
  const t = useTranslations("dashboard.validatedTable");
  const tArticles = useTranslations("setup.articles");
  const tMode = useTranslations("setup.articles.create.intentSummary.modes");
  const locale = useLocale() as ContentLanguage;

  if (articles.length === 0) {
    return (
      <section className={`${CARD_SOFT} p-6 text-center`}>
        <p className="text-sm font-medium text-ns-secondary">{t("empty")}</p>
      </section>
    );
  }

  return (
    <section className={`${CARD_SOFT} overflow-hidden`}>
      <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
        <h2 className="text-base font-bold text-ns-tertiary">{t("title")}</h2>
        <p className="mt-1 text-sm text-ns-secondary">{t("description")}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ns-brand-light/40 text-xs font-semibold uppercase tracking-wide text-ns-secondary">
            <tr>
              <th className="px-5 py-3 sm:px-6">{t("columns.hook")}</th>
              <th className="px-3 py-3">{t("columns.type")}</th>
              <th className="px-3 py-3">{t("columns.scope")}</th>
              <th className="px-3 py-3">{t("columns.angle")}</th>
              <th className="px-3 py-3">{t("columns.language")}</th>
              <th className="px-3 py-3">{t("columns.validatedAt")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {articles.map((article) => {
              const mode = inferArticleCreationMode(article);
              const scope = resolveArticleScope(article);
              const angle = article.postBrief?.postAngle;
              return (
                <tr key={article.id} className="hover:bg-ns-brand-light/20">
                  <td className="max-w-xs px-5 py-3 sm:px-6">
                    <Link
                      href={`/articles/${article.id}`}
                      className="line-clamp-2 font-medium text-ns-tertiary hover:text-ns-primary hover:underline"
                    >
                      {article.hook || tArticles("untitled")}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-ns-secondary">
                    {tMode(mode)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-ns-secondary">
                    {tArticles(`scope.${scope}`)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-ns-secondary">
                    {angle ? t(`angle.${angle}`) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 uppercase text-ns-secondary">
                    {article.contentLanguage}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-ns-secondary">
                    {formatValidatedDate(article.validatedAt, locale)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
