"use client";

import { useAuth } from "@/components/auth/auth-provider";
import {
  RECENT_ARTICLES_MAX,
  RECENT_ARTICLES_PREVIEW,
  listRecentArticles,
} from "@/lib/workspace/articles";
import { resolveArticleScope, SCOPE_CARD_CLASS } from "@/lib/articles/scope";
import { META_LABEL, SECTION_TITLE } from "@/lib/ui/nextstep";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ArticleDoc, ContentLanguage } from "@/types/workspace";
import { useEffect, useMemo, useState } from "react";

type Props = {
  onRework: (article: ArticleDoc) => void;
  reworkArticleId?: string | null;
};

export function RecentPostsSection({ onRework, reworkArticleId }: Props) {
  const t = useTranslations("setup.articles.create.recentPosts");
  const locale = useLocale() as ContentLanguage;
  const { user } = useAuth();
  const [articles, setArticles] = useState<ArticleDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      setLoading(true);
      try {
        setArticles(await listRecentArticles(user.uid, RECENT_ARTICLES_MAX));
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const visible = useMemo(
    () => (expanded ? articles : articles.slice(0, RECENT_ARTICLES_PREVIEW)),
    [articles, expanded],
  );

  const canExpand = articles.length > RECENT_ARTICLES_PREVIEW;
  const atMax = articles.length >= RECENT_ARTICLES_MAX;

  if (loading) {
    return (
      <section className="mt-10 border-t border-gray-100 pt-8">
        <p className="text-sm text-ns-secondary">…</p>
      </section>
    );
  }

  if (articles.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 border-t border-gray-100 pt-8" aria-labelledby="recent-posts-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="recent-posts-title" className={SECTION_TITLE}>
            {t("title")}
          </h3>
          <p className="mt-1 text-sm font-medium text-ns-secondary">{t("subtitle")}</p>
        </div>
        <Link
          href="/articles"
          className="text-sm font-semibold text-ns-primary underline hover:text-ns-tertiary"
        >
          {t("allPostsLink")}
        </Link>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {visible.map((a) => {
          const scope = resolveArticleScope(a);
          const selected = reworkArticleId === a.id;
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onRework(a)}
                className={[
                  "w-full rounded-xl border p-4 text-left transition-all",
                  SCOPE_CARD_CLASS[scope],
                  selected
                    ? "border-ns-primary ring-2 ring-ns-primary/30 shadow-md"
                    : "border-gray-100 hover:border-ns-primary/40 hover:shadow-sm",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={META_LABEL}>{t(`status.${a.status}`)}</p>
                  <time
                    className="text-[11px] text-ns-secondary"
                    dateTime={a.updatedAt.toISOString()}
                  >
                    {a.updatedAt.toLocaleDateString(locale)}
                  </time>
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-ns-tertiary">
                  {a.hook || t("untitled")}
                </p>
                <p className="mt-2 text-xs font-medium text-ns-primary">
                  {selected ? t("selected") : t("reworkCta")}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        {canExpand && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-lg border border-ns-alternate bg-white px-4 py-2 text-sm font-semibold text-ns-tertiary hover:border-ns-primary/50"
          >
            {t("seeMore", { count: Math.min(articles.length, RECENT_ARTICLES_MAX) })}
          </button>
        )}
        {expanded && canExpand && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-sm font-semibold text-ns-secondary underline"
          >
            {t("seeLess")}
          </button>
        )}
        {atMax && expanded && (
          <p className="text-xs text-ns-secondary">{t("maxHint", { max: RECENT_ARTICLES_MAX })}</p>
        )}
      </div>
    </section>
  );
}
