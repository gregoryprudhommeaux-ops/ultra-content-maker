"use client";

import {
  countScopes,
  resolveArticleScope,
} from "@/lib/articles/scope";
import {
  articleMatchesLibraryFilters,
  countArticles,
  libraryFiltersFromSearchParams,
} from "@/lib/articles/library-filters";
import { ArticlesHubHeader } from "@/components/articles/articles-hub-header";
import { DashboardPageShell } from "@/components/layout/dashboard-page";
import { CREATE_FRESH_HREF } from "@/lib/navigation/dashboard-nav";
import { ArticlesLibraryToolbar } from "@/components/articles/articles-library-toolbar";
import { ContextHelp } from "@/components/ui/context-help";
import { useOnboardingProgress } from "@/contexts/onboarding-progress-context";
import { isOnboardingBootstrapping } from "@/lib/workspace/onboarding-shell";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { useAuth } from "@/components/auth/auth-provider";
import { listArticleBatches, type ArticleBatchGroup } from "@/lib/workspace/articles";
import { Link, useRouter } from "@/i18n/navigation";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
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
  article: "bg-amber-100 text-amber-900",
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
  const onboardingBootstrapping = isOnboardingBootstrapping(
    onboardingLoading,
    progress,
  );
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
    if (onboardingBootstrapping || !progress) return;
    if (!progress.canAccessCreation) {
      router.replace("/start");
    }
  }, [onboardingBootstrapping, progress, router]);

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

  if (
    authLoading ||
    !loaded ||
    onboardingBootstrapping ||
    !progress?.canAccessCreation
  ) {
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
        <div className="rounded-2xl border border-dashed border-ns-border bg-ns-brand-light/40 px-8 py-12 text-center">
          <p className="text-base font-semibold text-ns-tertiary">{t("library.emptyTitle")}</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ns-secondary">
            {t("empty")}
          </p>
          <Link href={CREATE_FRESH_HREF} className={`mt-6 inline-flex ${BTN_PRIMARY}`}>
            {t("createCta")}
          </Link>
        </div>
      )}

      {hasAnyPosts && !hasFilterResults && (
        <div className="rounded-2xl border border-dashed border-ns-border bg-white px-8 py-10 text-center">
          <p className="text-sm font-medium text-ns-secondary">{t("library.emptyFiltered")}</p>
        </div>
      )}

      {visibleBatches.map((batch) => {
        const { generalist, niche } = countScopes(batch.articles);
        return (
          <section key={batch.batchId} className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-100 pb-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ns-primary">
                  {t("library.batchEyebrow")}
                </p>
                <h2 className="mt-1 text-base font-bold text-ns-tertiary md:text-lg">
                  {t("library.batchTitle", {
                    dateTime: formatBatchDateTime(batch.createdAt, locale),
                  })}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ns-secondary">
                  <span>{t("scopeMix", { generalist, niche })}</span>
                  <ContextHelp label={t("help.scopeMix.label")}>
                    {t("help.scopeMix.body")}
                  </ContextHelp>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${SESSION_BADGE[batch.sessionMode]}`}
                >
                  {tSession(batch.sessionMode)}
                </span>
                <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ns-secondary">
                  {t("library.batchCount", { count: batch.articles.length })}
                </span>
              </div>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
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
