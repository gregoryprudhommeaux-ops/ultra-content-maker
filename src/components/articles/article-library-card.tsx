"use client";

import { resolveArticleScope } from "@/lib/articles/scope";
import { Link } from "@/i18n/navigation";
import type { ArticleDoc, ArticleStatus } from "@/types/workspace";
import { useTranslations } from "next-intl";

const STATUS_BADGE: Record<ArticleStatus, string> = {
  draft: "bg-gray-100 text-ns-secondary",
  refining: "bg-amber-100 text-amber-900",
  validated: "bg-emerald-100 text-emerald-900",
};

type Props = {
  article: ArticleDoc;
  reworkLabel: string;
};

export function ArticleLibraryCard({ article, reworkLabel }: Props) {
  const t = useTranslations("setup.articles");
  const scope = resolveArticleScope(article);
  const accent =
    scope === "generalist"
      ? "border-l-ns-primary hover:border-ns-primary/35"
      : "border-l-ns-secondary hover:border-ns-secondary/35";

  return (
    <li
      className={`group flex flex-col overflow-hidden rounded-2xl border border-gray-100 border-l-[5px] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${accent}`}
    >
      <Link
        href={`/articles/${article.id}`}
        className="block flex-1 p-5 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE[article.status]}`}
          >
            {t(`status.${article.status}`)}
          </span>
          <span className="rounded-full border border-gray-200 bg-ns-brand-light/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ns-secondary">
            {t(`scope.${scope}`)}
          </span>
        </div>
        <p className="mt-3 line-clamp-4 text-sm font-medium leading-relaxed text-ns-tertiary group-hover:text-ns-hero">
          {article.hook || t("untitled")}
        </p>
      </Link>
      <div className="border-t border-gray-100 bg-ns-brand-light/20 px-5 py-3">
        <Link
          href={`/articles/new?rework=${article.id}`}
          className="text-xs font-semibold text-ns-primary underline-offset-2 hover:text-ns-tertiary hover:underline"
        >
          {reworkLabel}
        </Link>
      </div>
    </li>
  );
}
