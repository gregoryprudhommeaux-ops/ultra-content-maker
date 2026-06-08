"use client";

import { ContextHelp } from "@/components/ui/context-help";
import { useAuth } from "@/components/auth/auth-provider";
import { ButtonSpinner, GeneratingIndicator } from "@/components/ui/generating-indicator";
import { detectSlop } from "@/lib/articles/slop-detector";
import { getClientAuth } from "@/lib/firebase/client";
import { isInvalidApiKeyError } from "@/lib/llm/parse-json";
import { listValidatedArticles } from "@/lib/workspace/articles";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import {
  getPersonaPerformanceInsights,
  savePersonaPerformanceInsights,
} from "@/lib/workspace/persona-insights";
import type { ContentLanguage, PersonaPerformanceInsights } from "@/types/workspace";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type Props = {
  personaPromptText: string;
  disabled?: boolean;
};

export function PersonaPerformanceInsightsPanel({
  personaPromptText,
  disabled,
}: Props) {
  const t = useTranslations("setup.persona.insights");
  const locale = useLocale() as ContentLanguage;
  const { user } = useAuth();
  const [insights, setInsights] = useState<PersonaPerformanceInsights | null>(null);
  const [validatedCount, setValidatedCount] = useState(0);
  const [withSignalsCount, setWithSignalsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCounts = useCallback(async () => {
    if (!user) return;
    const posts = await listValidatedArticles(user.uid);
    setValidatedCount(posts.length);
    setWithSignalsCount(
      posts.filter(
        (p) =>
          p.performanceSignals &&
          (p.performanceSignals.saves != null ||
            p.performanceSignals.qualifiedComments != null ||
            p.performanceSignals.profileVisits != null ||
            p.performanceSignals.dms != null ||
            !!p.performanceSignals.businessOpportunity?.trim()),
      ).length,
    );
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const [stored] = await Promise.all([
          getPersonaPerformanceInsights(user.uid),
          refreshCounts(),
        ]);
        setInsights(stored);
      } catch {
        /* ignore */
      }
    })();
  }, [user, refreshCounts]);

  async function onSynthesize() {
    if (!user || !personaPromptText.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const posts = await listValidatedArticles(user.uid);
      const withSignals = posts.filter((p) => {
        const s = p.performanceSignals;
        if (!s) return false;
        return (
          s.saves != null ||
          s.qualifiedComments != null ||
          s.profileVisits != null ||
          s.dms != null ||
          !!s.businessOpportunity?.trim()
        );
      });

      if (withSignals.length === 0) {
        setError(t("needSignals"));
        return;
      }

      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const llmProfile = await getUserLlmProfile(user.uid);
      if (!token) throw new Error("no_token");
      if (!llmProfile?.apiKey) {
        setError(t("noLlmKey"));
        return;
      }

      const payload = withSignals.slice(0, 12).map((p) => ({
        hook: p.hook,
        objectives: p.postBrief?.objectives,
        signals: p.performanceSignals,
        qualityScores: p.qualityScores
          ? {
              nicheClarity: p.qualityScores.nicheClarity,
              conversationPotential: p.qualityScores.conversationPotential,
            }
          : undefined,
        slopScore: (p.slopAnalysis ?? detectSlop(`${p.hook}\n\n${p.body}`)).slopScore,
        validatedAt: p.validatedAt?.toISOString(),
      }));

      const res = await fetch("/api/persona/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contentLanguage: locale,
          personaPromptText,
          posts: payload,
          llm: {
            provider: llmProfile.provider,
            apiKey: llmProfile.apiKey,
            model: llmProfile.model,
          },
        }),
      });

      const data = (await res.json()) as {
        summary?: string;
        suggestions?: string[];
        postsAnalyzed?: number;
        error?: string;
        detail?: string;
      };

      if (!res.ok) {
        if (data.error === "no_validated_posts") {
          setError(t("needSignals"));
          return;
        }
        if (isInvalidApiKeyError(data.detail ?? data.error ?? "")) {
          setError(t("invalidApiKey"));
          return;
        }
        throw new Error(data.detail ?? data.error ?? "failed");
      }

      const next: PersonaPerformanceInsights = {
        summary: data.summary ?? "",
        suggestions: data.suggestions ?? [],
        postsAnalyzed: data.postsAnalyzed ?? payload.length,
        generatedAt: new Date(),
      };

      await savePersonaPerformanceInsights(user.uid, next);
      setInsights(next);
    } catch {
      setError(t("failed"));
    } finally {
      setLoading(false);
      void refreshCounts();
    }
  }

  return (
    <section className="rounded-xl border border-violet-200/60 bg-violet-50/40 p-5 space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-ns-tertiary">
          {t("title")}
          <ContextHelp label={t("title")}>{t("help")}</ContextHelp>
        </h2>
        <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
        <p className="mt-2 text-xs text-ns-secondary">
          {t("counts", {
            validated: validatedCount,
            withSignals: withSignalsCount,
          })}
        </p>
      </div>

      {loading && (
        <GeneratingIndicator
          label={t("generating")}
          hint={t("generatingHint")}
          className="w-full"
        />
      )}

      {insights && !loading && (
        <div className="space-y-3 rounded-lg border border-violet-100 bg-white p-4">
          <p className="text-xs text-ns-secondary">
            {t("lastRun", {
              date: insights.generatedAt.toLocaleDateString(locale),
              count: insights.postsAnalyzed,
            })}
          </p>
          <p className="text-sm text-ns-tertiary whitespace-pre-wrap leading-relaxed">
            {insights.summary}
          </p>
          {insights.suggestions.length > 0 && (
            <ul className="list-disc pl-5 space-y-1 text-sm text-ns-tertiary">
              {insights.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <button
          type="button"
          disabled={disabled || loading || withSignalsCount === 0}
          onClick={onSynthesize}
          className="inline-flex items-center gap-2 rounded-sm bg-ns-tertiary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-ns-tertiary/90 disabled:opacity-50"
        >
          {loading && <ButtonSpinner className="border-white/40 border-t-white" />}
          {t("synthesize")}
        </button>
        {withSignalsCount === 0 && validatedCount > 0 && (
          <Link href="/articles" className="text-sm font-medium text-ns-tertiary underline">
            {t("goAddSignals")}
          </Link>
        )}
      </div>

      {error && (
        <div className="space-y-1">
          <p className="text-sm text-red-600">{error}</p>
          {(error === t("noLlmKey") || error === t("invalidApiKey")) && (
            <Link href="/setup/llm" className="text-sm font-medium text-ns-tertiary underline">
              → {t("goLlmSetup")}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
