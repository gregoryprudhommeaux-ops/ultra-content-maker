"use client";

import {
  countScopes,
  resolveArticleScope,
  SCOPE_CARD_CLASS,
} from "@/lib/articles/scope";
import { ArticlesHubHeader } from "@/components/articles/articles-hub-header";
import { useOnboardingProgress } from "@/contexts/onboarding-progress-context";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { useAuth } from "@/components/auth/auth-provider";
import { listArticleBatches, type ArticleBatchGroup } from "@/lib/workspace/articles";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ArticleDoc, ContentLanguage } from "@/types/workspace";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function filterArticles(articles: ArticleDoc[], pendingOnly: boolean): ArticleDoc[] {
  if (!pendingOnly) return articles;
  return articles.filter((a) => a.status !== "validated");
}

export function ArticlesHub() {
  const t = useTranslations("setup.articles");
  const tRework = useTranslations("setup.articles.create.recentPosts");
  const locale = useLocale() as ContentLanguage;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { progress, loading: onboardingLoading } = useOnboardingProgress();
  const searchParams = useSearchParams();
  const pendingOnly = searchParams.get("pending") === "1";
  const [batches, setBatches] = useState<ArticleBatchGroup[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    void listArticleBatches(user.uid).then((list) => {
      setBatches(list);
      setLoaded(true);
    });
  }, [user]);

  useEffect(() => {
    if (onboardingLoading || !progress) return;
    if (!progress.canAccessCreation) {
      router.replace("/start");
    }
  }, [onboardingLoading, progress, router]);

  const visibleBatches = useMemo(
    () =>
      batches
        .map((batch) => ({
          ...batch,
          articles: filterArticles(batch.articles, pendingOnly),
        }))
        .filter((batch) => batch.articles.length > 0),
    [batches, pendingOnly],
  );

  if (authLoading || !loaded || onboardingLoading || !progress?.canAccessCreation) {
    return <GeneratingIndicator label="…" className="max-w-xl" />;
  }

  return (
    <div className="space-y-6">
      <ArticlesHubHeader pendingOnly={pendingOnly} />

      {visibleBatches.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-ns-brand-light/30 p-8 text-center">
          <p className="text-sm text-ns-secondary">
            {pendingOnly ? t("emptyPending") : t("empty")}
          </p>
          <Link
            href="/articles/new"
            className="mt-4 inline-block text-sm font-semibold text-ns-primary underline"
          >
            {t("createCta")} →
          </Link>
        </div>
      )}

      {visibleBatches.map((batch) => {
        const { generalist, niche } = countScopes(batch.articles);
        return (
          <section key={batch.batchId} className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <h2 className="text-sm font-medium text-ns-secondary">
                {t("batchLabel", {
                  date: batch.createdAt.toLocaleDateString(locale),
                })}
              </h2>
              <p className="text-xs text-ns-secondary/60">
                {t("scopeMix", { generalist, niche })}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-medium">
              <span className="inline-flex items-center gap-1.5 font-bold text-ns-tertiary">
                <span className="h-3 w-3 rounded-sm bg-ns-primary" aria-hidden />
                {t("scope.generalist")}
              </span>
              <span className="inline-flex items-center gap-1.5 font-bold text-ns-tertiary">
                <span
                  className="h-3 w-3 rounded-sm bg-ns-secondary"
                  aria-hidden
                />
                {t("scope.niche")}
              </span>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {batch.articles.map((a) => {
                const scope = resolveArticleScope(a);
                return (
                  <li
                    key={a.id}
                    className={`overflow-hidden rounded-xl border border-gray-100 ${SCOPE_CARD_CLASS[scope]}`}
                  >
                    <Link href={`/articles/${a.id}`} className="block p-4 transition-colors hover:bg-white/60">
                      <p className="text-right text-[11px] font-medium text-ns-secondary">
                        {t(`status.${a.status}`)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm font-medium text-ns-tertiary">
                        {a.hook || t("untitled")}
                      </p>
                    </Link>
                    <div className="border-t border-gray-100/80 px-4 py-2">
                      <Link
                        href={`/articles/new?rework=${a.id}`}
                        className="text-xs font-semibold text-ns-primary underline hover:text-ns-tertiary"
                      >
                        {tRework("reworkCta")}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}