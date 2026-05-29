"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { GapsQuestionnaire } from "@/components/persona/gaps-questionnaire";
import { notifyOnboardingProgressChanged } from "@/contexts/onboarding-progress-context";
import { getAudienceProfile } from "@/lib/workspace/audience";
import { getAuthorProfile } from "@/lib/workspace/author";
import { getProfileEnrichment } from "@/lib/workspace/enrichment";
import { OnboardingStepBanner } from "@/components/onboarding/onboarding-step-banner";
import { PersonaHistoryPanel } from "@/components/persona/persona-history-panel";
import { PersonaPerformanceInsightsPanel } from "@/components/persona/persona-performance-insights-panel";
import { PersonaRecentUpdatesPanel } from "@/components/persona/persona-recent-updates-panel";
import { PersonaRefinementPanel } from "@/components/persona/persona-refinement-panel";
import { formatVersionLine } from "@/lib/persona/persona-version";
import type { PersonaRecentChange } from "@/types/workspace";
import { getPersona, savePersonaDraft, validatePersona } from "@/lib/workspace/persona";
import { listSources } from "@/lib/workspace/sources";
import { isInvalidApiKeyError } from "@/lib/llm/parse-json";
import { recordGapFeedback } from "@/lib/persona/sync-persona-from-feedback";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import { serializeForApi } from "@/lib/workspace/serialize-profile";
import { updateSetupStep } from "@/lib/workspace/user";
import { getClientAuth } from "@/lib/firebase/client";
import { ButtonSpinner, GeneratingIndicator } from "@/components/ui/generating-indicator";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ContentLanguage, GapAnswerValue, ProfileGapQuestion } from "@/types/workspace";
import { useCallback, useEffect, useState } from "react";

export function PersonaEditor() {
  const t = useTranslations("setup.persona");
  const tCommon = useTranslations("common");
  const locale = useLocale() as ContentLanguage;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [promptText, setPromptText] = useState("");
  const [status, setStatus] = useState<"none" | "draft" | "validated">("none");
  const [gapQuestions, setGapQuestions] = useState<ProfileGapQuestion[]>([]);
  const [enrichmentDetails, setEnrichmentDetails] = useState<
    Record<string, GapAnswerValue>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [versionNumber, setVersionNumber] = useState<number | null>(null);
  const [recentChanges, setRecentChanges] = useState<PersonaRecentChange[]>([]);
  const [personaUpdatedAt, setPersonaUpdatedAt] = useState<Date | null>(null);
  const [contentLang, setContentLang] = useState<ContentLanguage>(locale);

  const load = useCallback(async () => {
    if (!user) {
      setLoaded(true);
      return;
    }
    try {
      const [p, enrichment, author] = await Promise.all([
        getPersona(user.uid),
        getProfileEnrichment(user.uid),
        getAuthorProfile(user.uid),
      ]);
      if (author?.contentLanguage) setContentLang(author.contentLanguage);
      if (p) {
        setPromptText(p.promptText);
        setStatus(
          p.status === "validated" ? "validated" : p.promptText ? "draft" : "none",
        );
        setGapQuestions(p.gapQuestions ?? []);
        setVersionNumber(p.versionNumber ?? null);
        setRecentChanges(p.recentChanges ?? []);
        setPersonaUpdatedAt(p.updatedAt);
      }
      if (enrichment) setEnrichmentDetails(enrichment.details);
    } catch {
      setError(t("loadFailed"));
    } finally {
      setLoaded(true);
    }
  }, [user, t]);

  useEffect(() => {
    if (authLoading) return;
    setLoaded(false);
    load();
  }, [authLoading, load]);

  async function onGenerate() {
    if (!user) return;
    setError(null);
    setPending(true);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) throw new Error("No auth token");

      const [author, audience, sources, llmProfile, enrichment] = await Promise.all([
        getAuthorProfile(user.uid),
        getAudienceProfile(user.uid),
        listSources(user.uid),
        getUserLlmProfile(user.uid),
        getProfileEnrichment(user.uid),
      ]);

      if (!llmProfile?.apiKey) {
        setError(t("noLlmKey"));
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120_000);

      let res: Response;
      try {
        res = await fetch("/api/persona/generate", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            author: serializeForApi(author),
            audience: serializeForApi(audience),
            sources: serializeForApi(sources),
            contentLanguage: author?.contentLanguage ?? locale,
            profileEnrichment: enrichment?.details ?? {},
            llm: {
              provider: llmProfile.provider,
              apiKey: llmProfile.apiKey,
              model: llmProfile.model,
            },
          }),
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await res.json();
      if (!res.ok) {
        const detail = typeof data.detail === "string" ? data.detail : "";
        if (
          data.error === "no_llm_key" ||
          data.error === "OPENAI_API_KEY not configured"
        ) {
          setError(t("noLlmKey"));
        } else if (isInvalidApiKeyError(detail)) {
          setError(t("invalidApiKey"));
        } else if (detail) {
          setError(t("generateFailedDetail", { detail: detail.slice(0, 180) }));
        } else {
          setError(t("generateFailed"));
        }
        return;
      }

      const lang = (author?.contentLanguage ?? locale) as ContentLanguage;
      setPromptText(data.promptText);
      setGapQuestions(data.gapQuestions ?? []);
      setStatus("draft");
      await savePersonaDraft(
        user.uid,
        data.promptText,
        data.model,
        data.gapQuestions,
        lang,
      );
      const saved = await getPersona(user.uid);
      if (saved) {
        setPromptText(saved.promptText);
        setVersionNumber(saved.versionNumber ?? 1);
        setRecentChanges(saved.recentChanges ?? []);
        setPersonaUpdatedAt(saved.updatedAt);
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setError(t("generateTimeout"));
      } else {
        setError(t("generateFailed"));
      }
    } finally {
      setPending(false);
    }
  }

  async function onSaveGaps(answers: Record<string, GapAnswerValue>) {
    if (!user) return;
    await recordGapFeedback(user.uid, gapQuestions, answers);
    const [enrichment, persona] = await Promise.all([
      getProfileEnrichment(user.uid),
      getPersona(user.uid),
    ]);
    if (enrichment) setEnrichmentDetails(enrichment.details);
    if (persona?.promptText) {
      setPromptText(persona.promptText);
      setVersionNumber(persona.versionNumber ?? null);
      setRecentChanges(persona.recentChanges ?? []);
      setPersonaUpdatedAt(persona.updatedAt);
    }
  }

  function applyPersonaFromStore(p: Awaited<ReturnType<typeof getPersona>>) {
    if (!p) return;
    setPromptText(p.promptText);
    setVersionNumber(p.versionNumber ?? null);
    setRecentChanges(p.recentChanges ?? []);
    setPersonaUpdatedAt(p.updatedAt);
  }

  async function onValidate() {
    if (!user || promptText.length < 200) return;
    setPending(true);
    setError(null);
    try {
      const author = await getAuthorProfile(user.uid);
      await validatePersona(
        user.uid,
        promptText,
        author?.contentLanguage ?? locale,
      );
      await updateSetupStep(user.uid, "articles");
      setStatus("validated");
      notifyOnboardingProgressChanged();
      router.push("/start/ready");
    } catch {
      setError(t("saveFailed"));
    } finally {
      setPending(false);
    }
  }

  if (!loaded) {
    return (
      <GeneratingIndicator
        label={tCommon("loading")}
        className="max-w-xl"
      />
    );
  }

  return (
    <div className="space-y-6">
      <OnboardingStepBanner stepKey="persona" />
      <Link href="/setup/audience" className="text-sm text-ns-secondary hover:text-ns-tertiary">
        {t("back")}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-ns-tertiary">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-ns-secondary">{t("subtitle")}</p>
      </div>

      {pending && (
        <GeneratingIndicator
          label={t("generating")}
          hint={t("generatingHint")}
          className="max-w-2xl"
        />
      )}

      {status === "none" && !promptText && !pending && (
        <button
          type="button"
          onClick={onGenerate}
          className="rounded-sm bg-ns-primary px-5 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-sm hover:bg-ns-primary/90"
        >
          {t("generate")}
        </button>
      )}

      {user && promptText && (
        <PersonaHistoryPanel
          userId={user.uid}
          currentPromptText={promptText}
          onRestored={async (text, nextStatus) => {
            setPromptText(text);
            setStatus(
              nextStatus === "validated"
                ? "validated"
                : text
                  ? "draft"
                  : "none",
            );
            if (user) {
              const p = await getPersona(user.uid);
              applyPersonaFromStore(p);
            }
          }}
        />
      )}

      {promptText && (
        <>
          {gapQuestions.length > 0 && status !== "validated" && (
            <GapsQuestionnaire
              questions={gapQuestions}
              initialAnswers={enrichmentDetails}
              onSave={onSaveGaps}
            />
          )}

          {versionNumber != null && personaUpdatedAt && (
            <p className="text-sm font-medium text-ns-tertiary">
              {formatVersionLine(versionNumber, personaUpdatedAt, contentLang)}
            </p>
          )}

          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={20}
            className="w-full rounded-xl border border-ns-alternate bg-white p-4 font-mono text-sm text-ns-tertiary leading-relaxed"
            readOnly={status === "validated"}
          />

          {status === "validated" && (
            <PersonaPerformanceInsightsPanel
              personaPromptText={promptText}
              disabled={pending}
            />
          )}

          {recentChanges.length > 0 && (
            <PersonaRecentUpdatesPanel changes={recentChanges} />
          )}

          {user && (
            <PersonaRefinementPanel
              userId={user.uid}
              contentLanguage={contentLang}
              disabled={pending}
              onUpdated={(text) => {
                setPromptText(text);
                void getPersona(user.uid).then(applyPersonaFromStore);
              }}
            />
          )}

          <div className="flex flex-wrap gap-3">
            {status !== "validated" && (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={onGenerate}
                  className="inline-flex items-center gap-2 rounded-lg border border-ns-alternate px-4 py-2.5 text-sm font-medium text-ns-tertiary hover:bg-ns-brand-light disabled:opacity-50"
                >
                  {pending ? (
                    <>
                      <ButtonSpinner className="border-ns-alternate border-t-zinc-800" />
                      {t("regenerating")}
                    </>
                  ) : (
                    t("regenerate")
                  )}
                </button>
                <button
                  type="button"
                  disabled={pending || promptText.length < 200}
                  onClick={onValidate}
                  className="inline-flex items-center gap-2 rounded-sm bg-ns-primary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-sm hover:bg-ns-primary/90 disabled:opacity-50"
                >
                  {pending ? (
                    <>
                      <ButtonSpinner />
                      {tCommon("loading")}
                    </>
                  ) : (
                    t("validate")
                  )}
                </button>
              </>
            )}
            {status === "validated" && (
              <Link
                href="/articles"
                className="rounded-sm bg-ns-primary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-sm hover:bg-ns-primary/90"
              >
                {t("goArticles")}
              </Link>
            )}
          </div>
        </>
      )}

      {error && (
        <div className="space-y-2">
          <p className="text-sm text-red-600">{error}</p>
          {(error === t("noLlmKey") || error === t("invalidApiKey")) && (
            <Link href="/setup/llm" className="text-sm font-medium text-ns-tertiary underline">
              → {t("goLlmSetup")}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
