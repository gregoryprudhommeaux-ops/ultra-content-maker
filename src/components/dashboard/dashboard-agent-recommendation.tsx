"use client";

import {
  inferArticleCreationMode,
  tallyCreationModes,
} from "@/lib/articles/infer-creation-mode";
import { recommendCreationMode } from "@/lib/dashboard/recommend-creation-mode";
import { CREATE_FRESH_HREF } from "@/lib/navigation/dashboard-nav";
import { CARD_SOFT, BTN_PRIMARY } from "@/lib/ui/nextstep";
import { Link } from "@/i18n/navigation";
import type { ArticleCreationMode, ArticleDoc, AuthorProfile } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

const MODE_ACCENT: Record<ArticleCreationMode, string> = {
  profile: "border-l-ns-primary",
  news: "border-l-sky-500",
  inspiration: "border-l-violet-500",
  article: "border-l-amber-500",
};

type Props = {
  validatedArticles: ArticleDoc[];
  inspirationSourcesCount: number;
  author: AuthorProfile | null;
};

export function DashboardAgentRecommendation({
  validatedArticles,
  inspirationSourcesCount,
  author,
}: Props) {
  const t = useTranslations("dashboard.recommendation");
  const tMode = useTranslations("setup.articles.create.intentSummary.modes");

  const recommendation = useMemo(() => {
    const validatedCounts = tallyCreationModes(validatedArticles);
    const cachedMode = author?.creationStrategyCache?.guide?.recommendedMode ?? null;
    return recommendCreationMode({
      validatedCounts,
      inspirationSourcesCount,
      cachedRecommendedMode: cachedMode,
    });
  }, [author?.creationStrategyCache, inspirationSourcesCount, validatedArticles]);

  const createHref = `${CREATE_FRESH_HREF}&mode=${recommendation.mode}`;
  const strategyNote =
    author?.creationStrategyCache?.guide?.modeJustification?.trim() ||
    author?.creationStrategyCache?.guide?.patternSummary?.trim();

  return (
    <section className={`${CARD_SOFT} border-l-4 ${MODE_ACCENT[recommendation.mode]} p-5 sm:p-6`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-ns-secondary">
        {t("eyebrow")}
      </p>
      <h2 className="mt-1 text-lg font-bold text-ns-tertiary">{t("title")}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ns-secondary">
        {t(`reason.${recommendation.reasonKey}`, {
          mode: tMode(recommendation.mode),
        })}
      </p>
      {strategyNote ? (
        <p className="mt-3 rounded-xl bg-ns-brand-light/50 px-4 py-3 text-sm leading-relaxed text-ns-tertiary">
          {strategyNote}
        </p>
      ) : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-ns-tertiary ring-1 ring-gray-200">
          {tMode(recommendation.mode)}
        </span>
        <Link href={createHref} className={`sm:ml-auto ${BTN_PRIMARY}`}>
          {t("cta", { mode: tMode(recommendation.mode) })}
        </Link>
      </div>
    </section>
  );
}
