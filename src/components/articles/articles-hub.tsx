"use client";

import {
  countScopes,
  resolveArticleScope,
  SCOPE_CARD_CLASS,
} from "@/lib/articles/scope";
import {
  articleMatchesLibraryFilters,
  countArticles,
  libraryFiltersFromSearchParams,
} from "@/lib/articles/library-filters";
import { ArticlesHubHeader } from "@/components/articles/articles-hub-header";
import { DashboardPageShell } from "@/components/layout/dashboard-page";
import { ArticlesLibraryToolbar } from "@/components/articles/articles-library-toolbar";
import { ContextHelp } from "@/components/ui/context-help";
import { useOnboardingProgress } from "@/contexts/onboarding-progress-context";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { useAuth } from "@/components/auth/auth-provider";
import { listArticleBatches, type ArticleBatchGroup } from "@/lib/workspace/articles";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import type {
  ArticleCreationMode,
  ArticleDoc,
  ArticleStatus,
  ContentLanguage,
} from "@/types/workspace";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const STATUS_BADGE: Record<ArticleStatus, string> = {
  draft: "bg-gray-100 text-ns-secondary",
  refining: "bg-amber-100 text-amber-900",
  validated: "bg-emerald-100 text-emerald-900",
};

const SESSION_BADGE: Record<ArticleCreationMode, string> = {
  profile: "bg-ns-brand-light text-ns-tertiary",
  news: "bg-sky-100 text-sky-900",
  inspiration: "bg-violet-100 text-violet-900",
};

function formatBatchDateTime(date: Date, locale: ContentLanguage): string {
  const tag =
    locale === "en" ? "en-US" : locale === "es" ? "es-MX" : "fr-FR";
  return new Intl.DateTimeFormat(tag, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function ArticlesHub() {
  const t = useTranslations("setup.articles");
  const tSession = useTranslations("setup.articles.create.intentSummary.modes");
  const tRework = useTranslations("setup.articles.create.recentPosts");
  const locale = useLocale() as ContentLanguage;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { progress, loading: onboardingLoading } = useOnboardingProgress();
  const searchParams = useSearchParams();
  const urlFilters = libraryFiltersFromSearchParams(searchParams);
  const [query, setQuery] = useState("");
  const [batches, setBatches] = useState<ArticleBatchGroup[]>([]);
  const [loaded, setLoaded] = useState(false);

  const filters = useMemo(
    () => ({
      query,
      status: urlFilters.status,
      scope: urlFilters.scope,
    }),
    [query, urlFilters.scope, urlFilters.status],
  );

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

  const totalCount = useMemo(() => countArticles(batches), [batches]);

  const visibleBatches = useMemo(
    () =>
      batches
        .map((batch) => ({
          ...batch,
          articles: batch.articles.filter((a) => articleMatchesLibraryFilters(a, filters)),
        }))
        .filter((batch) => batch.articles.length > 0)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [batches, filters],
  );

  const visibleCount = useMemo(
    () => countArticles(visibleBatches),
    [visibleBatches],
  );

  const hasAnyPosts = totalCount > 0;
  const hasFilterResults = visibleCount > 0;

  if (authLoading || !loaded || onboardingLoading || !progress?.canAccessCreation) {
    return <GeneratingIndicator label="…" className="max-w-xl" />;
  }

  return (
    <DashboardPageShell>
      <div className="space-y-6">
      <ArticlesHubHeader statusFilter={filters.status} />

      {hasAnyPosts && (
        <ArticlesLibraryToolbar
          filters={filters}
          onQueryChange={setQuery}
          onResetQuery={() => setQuery("")}
          visibleCount={visibleCount}
          totalCount={totalCount}
        />
      )}

      {!hasAnyPosts && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-ns-brand-light/30 p-8 text-center">
          <p className="text-sm text-ns-secondary">{t("empty")}</p>
          <Link
            href="/articles/new"
            className="mt-4 inline-block text-sm font-semibold text-ns-primary underline"
          >
            {t("createCta")} →
          </Link>
        </div>
      )}

      {hasAnyPosts && !hasFilterResults && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-ns-brand-light/30 p-8 text-center">
          <p className="text-sm text-ns-secondary">{t("library.emptyFiltered")}</p>
        </div>
      )}

      {visibleBatches.map((batch) => {
        const { generalist, niche } = countScopes(batch.articles);
        return (
          <section key={batch.batchId} className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-sm font-semibold text-ns-tertiary">
                {t("library.batchTitle", {
                  dateTime: formatBatchDateTime(batch.createdAt, locale),
                })}
              </h2>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${SESSION_BADGE[batch.sessionMode]}`}
              >
                {tSession(batch.sessionMode)}
              </span>
              <p className="flex items-center gap-1.5 text-xs text-ns-secondary/80">
                <span>{t("scopeMix", { generalist, niche })}</span>
                <ContextHelp label={t("help.scopeMix.label")}>
                  {t("help.scopeMix.body")}
                </ContextHelp>
              </p>
              <span className="rounded-full bg-ns-brand-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ns-secondary">
                {t("library.batchCount", { count: batch.articles.length })}
              </span>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {batch.articles.map((a) => (
                <ArticleLibraryCard key={a.id} article={a} reworkLabel={tRework("reworkCta")} t={t} />
              ))}
            </ul>
          </section>
        );
      })}
      </div>
    </DashboardPageShell>
  );
}

function ArticleLibraryCard({
  article,
  reworkLabel,
  t,
}: {
  article: ArticleDoc;
  reworkLabel: string;
  t: ReturnType<typeof useTranslations<"setup.articles">>;
}) {
  const scope = resolveArticleScope(article);

  return (
    <li
      className={`overflow-hidden rounded-xl border border-gray-100 ${SCOPE_CARD_CLASS[scope]}`}
    >
      <Link
        href={`/articles/${article.id}`}
        className="block p-4 transition-colors hover:bg-white/60"
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE[article.status]}`}
          >
            {t(`status.${article.status}`)}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-ns-secondary">
            {t(`scope.${scope}`)}
          </span>
        </div>
        <p className="mt-2 line-clamp-3 text-sm font-medium text-ns-tertiary">
          {article.hook || t("untitled")}
        </p>
      </Link>
      <div className="border-t border-gray-100/80 px-4 py-2">
        <Link
          href={`/articles/new?rework=${article.id}`}
          className="text-xs font-semibold text-ns-primary underline hover:text-ns-tertiary"
        >
          {reworkLabel}
        </Link>
      </div>
    </li>
  );
}
