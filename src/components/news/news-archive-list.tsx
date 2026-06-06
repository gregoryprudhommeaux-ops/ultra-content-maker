"use client";

import { NewsCard, formatNewsDate } from "@/components/news/news-card";
import { NewsDetailModal } from "@/components/news/news-detail-modal";
import { OnboardingBlockedBanner } from "@/components/onboarding/onboarding-blocked-banner";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { useAuth } from "@/components/auth/auth-provider";
import { useOnboardingProgress } from "@/contexts/onboarding-progress-context";
import { isOnboardingBootstrapping } from "@/lib/workspace/onboarding-shell";
import {
  ARCHIVED_NEWS_DISPLAY_LIMIT,
  listArchivedNews,
  type ArchivedNewsDoc,
} from "@/lib/workspace/news-archive";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ContentLanguage } from "@/types/workspace";
import { useCallback, useEffect, useState } from "react";

export function NewsArchiveList() {
  const t = useTranslations("setup.news");
  const locale = useLocale() as ContentLanguage;
  const { user, loading: authLoading } = useAuth();
  const { progress, status, loading: onboardingLoading } = useOnboardingProgress();
  const onboardingBootstrapping = isOnboardingBootstrapping(
    onboardingLoading,
    progress,
  );
  const [archived, setArchived] = useState<ArchivedNewsDoc[]>([]);
  const [selected, setSelected] = useState<ArchivedNewsDoc | null>(null);
  const [detailItem, setDetailItem] = useState<ArchivedNewsDoc | null>(null);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    const items = await listArchivedNews(user.uid, ARCHIVED_NEWS_DISPLAY_LIMIT);
    setArchived(items);
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoaded(true);
      return;
    }
    reload().catch(() => setLoaded(true));
  }, [user, authLoading, reload]);

  const canCreateFromNews = progress?.canAccessCreation ?? false;
  const setupNextHref = status?.nextHref ?? "/start";

  if (!loaded || onboardingBootstrapping) {
    return <GeneratingIndicator label="…" className="max-w-xl" />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {!canCreateFromNews && progress && (
        <OnboardingBlockedBanner
          reason={
            !progress.completion.hasApiKey
              ? "llm"
              : !progress.completion.hasProfileMinimum
                ? "author"
                : !progress.completion.hasAudience
                  ? "audience"
                  : "persona"
          }
        />
      )}
      <header className="space-y-2">
        <Link
          href="/articles/new?mode=news"
          className="text-sm text-ns-secondary hover:text-ns-tertiary"
        >
          ← {t("backToWizard")}
        </Link>
        <h1 className="text-2xl font-bold text-ns-tertiary">{t("title")}</h1>
        <p className="text-sm text-ns-secondary">{t("subtitleArchive")}</p>
        <p className="text-xs text-ns-secondary">{t("archiveLimitNote")}</p>
      </header>

      {archived.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm text-ns-secondary">{t("empty")}</p>
          <Link href="/articles/new?mode=news" className={`mt-4 inline-block ${BTN_PRIMARY}`}>
            {t("scanFreshNews")}
          </Link>
        </div>
      )}

      {archived.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {archived.map((item) => (
            <li key={item.id}>
              <NewsCard
                item={item}
                selected={selected?.id === item.id}
                showSelectLabel
                onClick={() => setSelected(item)}
                onRead={() => setDetailItem(item)}
              />
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <section className="rounded-xl border-2 border-ns-primary/40 bg-gradient-to-b from-ns-primary/10 to-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-ns-tertiary">
                {t("selectedBadge")}
              </p>
              <p className="mt-1 text-xs font-medium text-ns-secondary">
                {selected.sourceName ?? t("unknownSource")} ·{" "}
                {formatNewsDate(selected.publishedAt, locale)}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-ns-tertiary">{selected.title}</h2>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-sm text-ns-secondary underline hover:text-ns-tertiary"
            >
              {t("changeNews")}
            </button>
          </div>
          <p className="text-sm leading-relaxed text-ns-secondary whitespace-pre-wrap line-clamp-4">
            {selected.summary}
          </p>
          <p className="text-xs text-ns-secondary">{t("archiveCreateHint")}</p>
          {canCreateFromNews ? (
            <Link
              href={`/articles/new?mode=news&newsId=${encodeURIComponent(selected.id)}`}
              className={`inline-block ${BTN_PRIMARY}`}
            >
              {t("createPostFromArchive")}
            </Link>
          ) : (
            <Link href={setupNextHref} className={`inline-block ${BTN_PRIMARY}`}>
              {t("briefOnArticles")}
            </Link>
          )}
        </section>
      )}

      <NewsDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
    </div>
  );
}
