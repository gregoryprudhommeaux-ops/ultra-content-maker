"use client";

import { ArticleLibraryCard } from "@/components/articles/article-library-card";
import { countScopes } from "@/lib/articles/scope";
import {
  articleMatchesLibraryFilters,
  countArticles,
  libraryFiltersFromSearchParams,
} from "@/lib/articles/library-filters";
import { ArticlesHubHeader } from "@/components/articles/articles-hub-header";
import {
  ArticlesLibraryBatches,
  BatchScopeMix,
} from "@/components/articles/articles-library-batches";
import { DashboardPageShell } from "@/components/layout/dashboard-page";
import { CREATE_FRESH_HREF } from "@/lib/navigation/dashboard-nav";
import { ArticlesLibraryToolbar } from "@/components/articles/articles-library-toolbar";
import { useOnboardingProgress } from "@/contexts/onboarding-progress-context";
import { isOnboardingBootstrapping } from "@/lib/workspace/onboarding-shell";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { useAuth } from "@/components/auth/auth-provider";
import { listArticleBatches, type ArticleBatchGroup } from "@/lib/workspace/articles";
import { Link, useRouter } from "@/i18n/navigation";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { useLocale, useTranslations } from "next-intl";
import type { ArticleCreationMode, ContentLanguage } from "@/types/workspace";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

      {hasFilterResults && (
        <>
          <p className="flex items-start gap-2 rounded-xl border border-gray-100 bg-ns-brand-light/40 px-4 py-3 text-xs leading-relaxed text-ns-secondary">
            <span className="mt-0.5 shrink-0 text-ns-primary" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path d="M12 10v5M12 7h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            {t("library.batchCollapseHint")}
          </p>
          <ArticlesLibraryBatches
          batches={visibleBatches}
          locale={locale}
          formatBatchDateTime={formatBatchDateTime}
          sessionBadge={(batch) => (
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${SESSION_BADGE[batch.sessionMode]}`}
            >
              {tSession(batch.sessionMode)}
            </span>
          )}
          scopeMix={(batch) => {
            const { generalist, niche } = countScopes(batch.articles);
            return (
              <BatchScopeMix
                generalist={generalist}
                niche={niche}
                helpLabel={t("help.scopeMix.label")}
                helpBody={t("help.scopeMix.body")}
              />
            );
          }}
          renderBatchCards={(batch) => (
            <ul className="grid gap-4 sm:grid-cols-2">
              {batch.articles.map((a) => (
                <ArticleLibraryCard
                  key={a.id}
                  article={a}
                  reworkLabel={tRework("reworkCta")}
                />
              ))}
            </ul>
          )}
        />
        </>
      )}
      </div>
    </DashboardPageShell>
  );
}
