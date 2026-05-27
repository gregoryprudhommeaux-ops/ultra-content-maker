"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import { isInvalidApiKeyError } from "@/lib/llm/parse-json";
import type { WizardCreationMode } from "@/lib/prompts/post-brief";
import { gatherAuthorSteeringPayload } from "@/lib/profile/gather-author-steering";
import { getAuthorProfile, saveAuthorProfile } from "@/lib/workspace/author";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import { META_LABEL } from "@/lib/ui/nextstep";
import type {
  ContentLanguage,
  CreationStrategyGuide,
  CreationStrategyTheme,
} from "@/types/workspace";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

type ModeId = WizardCreationMode;

const RELATION_BADGE: Record<
  CreationStrategyTheme["relationToHistory"],
  string
> = {
  continuity: "bg-emerald-100 text-emerald-900",
  correction: "bg-amber-100 text-amber-900",
  pivot: "bg-violet-100 text-violet-900",
  news: "bg-sky-100 text-sky-900",
};

type Props = {
  personaText: string;
  onRecommendMode: (mode: ModeId) => void;
  onApplyTheme?: (theme: CreationStrategyTheme, mode: ModeId) => void;
};

export function CreationStrategyGuidePanel({
  personaText,
  onRecommendMode,
  onApplyTheme,
}: Props) {
  const t = useTranslations("setup.articles.create.modePicker.strategy");
  const locale = useLocale() as ContentLanguage;
  const { user } = useAuth();

  const [activityUrl, setActivityUrl] = useState<string | null>(null);
  const [guide, setGuide] = useState<CreationStrategyGuide | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [perplexityHint, setPerplexityHint] = useState(false);
  const [steering, setSteering] = useState("");
  const fetchedRef = useRef(false);

  const runAnalysis = useCallback(
    async (forceRefresh = false, steeringOverride?: string) => {
      if (!user || !activityUrl?.trim() || !personaText.trim()) return;

      setLoading(true);
      setError(null);
      setPerplexityHint(false);

      try {
        const auth = getClientAuth();
        const token = auth ? await auth.currentUser?.getIdToken() : null;
        const [llmProfile, author, authorSteering] = await Promise.all([
          getUserLlmProfile(user.uid),
          getAuthorProfile(user.uid),
          gatherAuthorSteeringPayload(user.uid),
        ]);

        if (!token || !llmProfile?.apiKey) {
          setError(t("noLlm"));
          return;
        }

        const steeringText = (steeringOverride ?? steering).trim().slice(0, 1500);

        const res = await fetch("/api/linkedin/creation-strategy", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            linkedinActivityUrl: activityUrl,
            contentLanguage: author?.contentLanguage ?? locale,
            personaPromptText: personaText,
            roleTitle: author?.roleTitle,
            positioningLine: author?.positioningLine,
            authorSteering,
            userSteering: steeringText || undefined,
            forceRefresh,
            cached: forceRefresh ? null : author?.creationStrategyCache ?? null,
            llm: {
              provider: llmProfile.provider,
              apiKey: llmProfile.apiKey,
              model: llmProfile.model,
            },
          }),
        });

        const data = (await res.json()) as {
          error?: string;
          guide?: CreationStrategyGuide;
          cache?: { activityUrl: string; analyzedAt: string; guide: CreationStrategyGuide };
          detail?: string;
          perplexityRecommended?: boolean;
        };

        if (!res.ok) {
          if (data.error === "linkedin_requires_perplexity") {
            setError(t("perplexityRequired"));
            setPerplexityHint(true);
            return;
          }
          if (data.error === "not_activity_url") {
            setError(t("notActivityUrl"));
            return;
          }
          if (data.error === "invalid_api_key" || isInvalidApiKeyError(data.detail ?? "")) {
            setError(t("invalidKey"));
            return;
          }
          setError(t("failed"));
          return;
        }

        if (!data.guide) {
          setError(t("failed"));
          return;
        }

        setGuide(data.guide);
        onRecommendMode(data.guide.recommendedMode);

        const cachePayload =
          data.cache ??
          ({
            activityUrl,
            analyzedAt: new Date().toISOString(),
            guide: data.guide,
            steering: steeringText || undefined,
          } as const);
        await saveAuthorProfile(user.uid, {
          creationStrategyCache: cachePayload,
          creationStrategySteering: steeringText || undefined,
        });
      } catch {
        setError(t("failed"));
      } finally {
        setLoading(false);
      }
    },
    [activityUrl, locale, onRecommendMode, personaText, steering, t, user],
  );

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const author = await getAuthorProfile(user.uid);
      const url = author?.linkedinActivityUrl?.trim();
      setActivityUrl(url ?? null);
      setSteering(author?.creationStrategySteering ?? "");

      const cache = author?.creationStrategyCache;
      if (
        cache?.guide &&
        cache.activityUrl === url &&
        url
      ) {
        setGuide(cache.guide);
        onRecommendMode(cache.guide.recommendedMode);
      }
    })();
  }, [user, onRecommendMode]);

  useEffect(() => {
    if (!user || !activityUrl || !personaText.trim() || fetchedRef.current) return;
    if (guide) return;
    fetchedRef.current = true;
    void runAnalysis(false);
  }, [user, activityUrl, personaText, guide, runAnalysis]);

  if (!activityUrl) {
    return (
      <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-ns-tertiary">
        <p className="font-semibold">{t("missingUrlTitle")}</p>
        <p className="mt-1 text-ns-secondary">{t("missingUrlBody")}</p>
        <Link
          href="/setup/author"
          className="mt-2 inline-block text-sm font-semibold text-ns-primary underline"
        >
          {t("missingUrlCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {loading && (
        <p className="text-sm font-medium text-ns-secondary animate-pulse">{t("analyzing")}</p>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{error}</p>
          {perplexityHint && (
            <Link href="/setup/llm" className="mt-1 inline-block font-semibold underline">
              {t("perplexityCta")}
            </Link>
          )}
          <button
            type="button"
            onClick={() => void runAnalysis(true)}
            className="mt-2 block text-sm font-semibold underline"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {guide && !loading && (
        <>
          <div className="rounded-xl border border-ns-primary/25 bg-white px-4 py-4 shadow-sm">
            <p className={META_LABEL}>{t("patternLabel")}</p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-ns-tertiary">
              {guide.patternSummary}
            </p>
            <p className="mt-3 text-xs text-ns-secondary">
              {t("postsCount", {
                count: guide.postsAnalyzed,
                period: guide.periodLabel,
              })}
            </p>
          </div>

          <div className="rounded-xl border border-ns-primary/30 bg-ns-primary/5 px-4 py-4">
            <p className={META_LABEL}>{t("modeLabel")}</p>
            <p className="mt-1 text-sm font-black uppercase tracking-tight text-ns-tertiary">
              {t(`modes.${guide.recommendedMode}`)}
            </p>
            <p className="mt-2 text-sm font-medium text-ns-secondary">
              {guide.modeJustification}
            </p>
            <button
              type="button"
              onClick={() => onRecommendMode(guide.recommendedMode)}
              className="mt-3 rounded-lg bg-ns-hero px-3 py-2 text-xs font-bold uppercase tracking-wider text-ns-primary hover:bg-ns-primary hover:text-black"
            >
              {t("highlightMode")}
            </button>
          </div>

          <div>
            <p className={META_LABEL}>{t("themesLabel")}</p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {guide.themes.map((theme, i) => (
                <li key={theme.title}>
                  <button
                    type="button"
                    onClick={() => {
                      onRecommendMode(theme.suggestedMode);
                      onApplyTheme?.(theme, theme.suggestedMode);
                    }}
                    className="h-full w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-ns-primary/50 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black text-ns-secondary">
                        {i + 1}/4
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${RELATION_BADGE[theme.relationToHistory]}`}
                      >
                        {t(`relation.${theme.relationToHistory}`)}
                      </span>
                    </div>
                    <h4 className="mt-2 text-sm font-bold text-ns-tertiary">{theme.title}</h4>
                    <p className="mt-1 text-xs font-medium text-ns-secondary">{theme.angle}</p>
                    <p className="mt-2 text-xs text-ns-secondary/90">{theme.rationale}</p>
                    {theme.newsHook && (
                      <p className="mt-2 text-xs font-semibold text-sky-800">
                        {t("newsHook")}: {theme.newsHook}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-dashed border-ns-alternate/80 bg-white/80 p-4">
            <label htmlFor="strategy-steering" className={LABEL_CLASS}>
              {t("steeringLabel")}
            </label>
            <p className="mt-1 text-xs text-ns-secondary">{t("steeringHint")}</p>
            <textarea
              id="strategy-steering"
              value={steering}
              onChange={(e) => setSteering(e.target.value)}
              placeholder={t("steeringPlaceholder")}
              rows={3}
              className={`${INPUT_CLASS} mt-2 resize-y`}
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                fetchedRef.current = true;
                void runAnalysis(true);
              }}
              className="mt-3 rounded-lg border border-ns-alternate bg-ns-brand-light px-4 py-2 text-sm font-semibold text-ns-tertiary hover:border-ns-primary/50 disabled:opacity-50"
            >
              {loading ? t("analyzing") : t("refresh")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
