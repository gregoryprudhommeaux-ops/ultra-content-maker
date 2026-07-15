"use client";

import { ArticleLibraryCard } from "@/components/articles/article-library-card";
import { ArticlesLibraryBatches, BatchScopeMix } from "@/components/articles/articles-library-batches";
import { ArticlesLibraryToolbar } from "@/components/articles/articles-library-toolbar";
import { DashboardAgentRecommendation } from "@/components/dashboard/dashboard-agent-recommendation";
import { DashboardQuotaStats } from "@/components/dashboard/dashboard-quota-stats";
import { DashboardValidatedTable } from "@/components/dashboard/dashboard-validated-table";
import { DashboardPageHero, DashboardPageShell } from "@/components/layout/dashboard-page";
import { useAuth } from "@/components/auth/auth-provider";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { ContextHelp } from "@/components/ui/context-help";
import { useOnboardingProgress } from "@/contexts/onboarding-progress-context";
import { useWorkspace } from "@/contexts/workspace-context";
import {
  articleMatchesLibraryFilters,
  countArticles,
  libraryFiltersFromSearchParams,
} from "@/lib/articles/library-filters";
import { countScopes } from "@/lib/articles/scope";
import { CREATE_FRESH_HREF } from "@/lib/navigation/dashboard-nav";
import { getAuthorProfile } from "@/lib/workspace/author";
import { listArticleBatches, type ArticleBatchGroup } from "@/lib/workspace/articles";
import { listSourcesByCategory } from "@/lib/workspace/sources";
import { isOnboardingBootstrapping } from "@/lib/workspace/onboarding-shell";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui/nextstep";
import { Link, useRouter } from "@/i18n/navigation";
import type {
  ArticleCreationMode,
  ArticleDoc,
  AuthorProfile,
  ContentLanguage,
} from "@/types/workspace";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const SESSION_BADGE: Record<ArticleCreationMode, string> = {
  profile: "bg-ns-brand-light text-ns-tertiary",
  news: "bg-sky-100 text-sky-900",
  inspiration: "bg-violet-100 text-violet-900",
  article: "bg-amber-100 text-amber-900",
};

function formatBatchDateTime(date: Date, locale: ContentLanguage): string {
  const tag = locale === "en" ? "en-US" : locale === "es" ? "es-MX" : "fr-FR";
  return new Intl.DateTimeFormat(tag, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function DashboardHub() {
  const t = useTranslations("dashboard");
  const tArticles = useTranslations("setup.articles");
  const tSession = useTranslations("setup.articles.create.intentSummary.modes");
  const tRework = useTranslations("setup.articles.create.recentPosts");
  const locale = useLocale() as ContentLanguage;
  const { user, loading: authLoading } = useAuth();
  const { scope } = useWorkspace();
  const router = useRouter();
  const { progress, loading: onboardingLoading } = useOnboardingProgress();
  const onboardingBootstrapping = isOnboardingBootstrapping(onboardingLoading, progress);
  const searchParams = useSearchParams();
  const urlFilters = libraryFiltersFromSearchParams(searchParams);
  const [query, setQuery] = useState("");
  const [batches, setBatches] = useState<ArticleBatchGroup[]>([]);
  const [author, setAuthor] = useState<AuthorProfile | null>(null);
  const [inspirationSourcesCount, setInspirationSourcesCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const workspaceKey = `${scope?.ownerId ?? ""}:${scope?.accountId ?? ""}`;

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
    setLoaded(false);
    setBatches([]);
    setAuthor(null);
    setInspirationSourcesCount(0);
    void Promise.all([
      listArticleBatches(user.uid),
      getAuthorProfile(user.uid),
      Promise.all([
        listSourcesByCategory(user.uid, "inspiration_post"),
        listSourcesByCategory(user.uid, "inspiration_profile"),
      ]),
    ]).then(([batchList, authorProfile, inspirationLists]) => {
      setBatches(batchList);
      setAuthor(authorProfile);
      setInspirationSourcesCount(
        inspirationLists[0].length + inspirationLists[1].length,
      );
      setLoaded(true);
    });
  }, [user, workspaceKey]);

  useEffect(() => {
    if (onboardingBootstrapping || !progress) return;
    if (!progress.canAccessCreation) {
      router.replace("/start");
    }
  }, [onboardingBootstrapping, progress, router]);

  const allArticles = useMemo(
    () => batches.flatMap((batch) => batch.articles),
    [batches],
  );

  const validatedArticles = useMemo(
    () =>
      allArticles
        .filter((a) => a.status === "validated")
        .sort(
          (a, b) =>
            (b.validatedAt?.getTime() ?? 0) - (a.validatedAt?.getTime() ?? 0),
        ),
    [allArticles],
  );

  const pendingCount = useMemo(
    () => allArticles.filter((a) => a.status !== "validated").length,
    [allArticles],
  );

  const lastValidatedAt = validatedArticles[0]?.validatedAt ?? null;

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
  const isPendingView = filters.status === "pending";

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
      <div className="space-y-8">
        <DashboardPageHero
          variant="gradient"
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={isPendingView ? t("subtitlePending") : t("subtitle")}
          titleExtra={
            <ContextHelp label={tArticles("help.lot.label")}>
              {tArticles("help.lot.body")}
            </ContextHelp>
          }
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Link
                href="/setup/author?tab=inspirations&from=dashboard"
                className={`w-full text-center sm:w-auto ${BTN_SECONDARY}`}
              >
                {tArticles("updateInspirations")}
              </Link>
              <Link href={CREATE_FRESH_HREF} className={`w-full text-center sm:w-auto ${BTN_PRIMARY}`}>
                {tArticles("createCta")}
              </Link>
            </div>
          }
        />

        <DashboardQuotaStats
          validatedCount={validatedArticles.length}
          pendingCount={pendingCount}
          lastValidatedAt={lastValidatedAt}
        />

        <DashboardAgentRecommendation
          validatedArticles={validatedArticles}
          inspirationSourcesCount={inspirationSourcesCount}
          author={author}
        />

        <DashboardValidatedTable articles={validatedArticles} />

        <section className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-ns-tertiary">{t("librarySection.title")}</h2>
            <p className="mt-1 text-sm text-ns-secondary">
              {isPendingView
                ? t("librarySection.descriptionPending")
                : t("librarySection.description")}
            </p>
          </div>

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
              <p className="text-base font-semibold text-ns-tertiary">
                {tArticles("library.emptyTitle")}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ns-secondary">
                {tArticles("empty")}
              </p>
              <Link href={CREATE_FRESH_HREF} className={`mt-6 inline-flex ${BTN_PRIMARY}`}>
                {tArticles("createCta")}
              </Link>
            </div>
          )}

          {hasAnyPosts && !hasFilterResults && (
            <div className="rounded-2xl border border-dashed border-ns-border bg-white px-8 py-10 text-center">
              <p className="text-sm font-medium text-ns-secondary">
                {tArticles("library.emptyFiltered")}
              </p>
            </div>
          )}

          {hasFilterResults && (
            <>
              <p className="flex items-start gap-2 rounded-xl border border-gray-100 bg-ns-brand-light/40 px-4 py-3 text-xs leading-relaxed text-ns-secondary">
                <span className="mt-0.5 shrink-0 text-ns-primary" aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                    <path
                      d="M12 10v5M12 7h.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                {tArticles("library.batchCollapseHint")}
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
                      helpLabel={tArticles("help.scopeMix.label")}
                      helpBody={tArticles("help.scopeMix.body")}
                    />
                  );
                }}
                renderBatchCards={(batch) => (
                  <ul className="grid gap-4 sm:grid-cols-2">
                    {batch.articles.map((a: ArticleDoc) => (
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
        </section>
      </div>
    </DashboardPageShell>
  );
}
