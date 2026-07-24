"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/contexts/workspace-context";
import { useSubscription } from "@/contexts/subscription-context";
import { useFormatUserError } from "@/hooks/use-format-user-error";
import { Link } from "@/i18n/navigation";
import { getClientAuth } from "@/lib/firebase/client";
import { llmPayloadForTier } from "@/lib/llm/client-payload";
import {
  defaultPostObjectiveForCycle,
  markEditorialCycleItemUsed,
} from "@/lib/prompts/editorial-cycle";
import { BTN_PRIMARY, BTN_SECONDARY, META_LABEL } from "@/lib/ui/nextstep";
import { getAuthorProfile, saveAuthorProfile } from "@/lib/workspace/author";
import { getAudienceProfile } from "@/lib/workspace/audience";
import { getPersona } from "@/lib/workspace/persona";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import type {
  ContentLanguage,
  EditorialCycle,
  EditorialCycleObjective,
} from "@/types/workspace";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

const OBJECTIVES: EditorialCycleObjective[] = [
  "authority",
  "launch",
  "conversion",
  "reposition",
];

function itemHref(cycle: EditorialCycle, itemId: string, title: string, angle: string): string {
  const objective = defaultPostObjectiveForCycle(cycle.objective);
  const params = new URLSearchParams({
    mode: "profile",
    problem: title.slice(0, 280),
    pointOfView: angle.slice(0, 500),
    cycleItemId: itemId,
    objective,
  });
  return `/articles/new?${params.toString()}`;
}

export function DashboardEditorialCyclePanel() {
  const t = useTranslations("dashboard.editorialCycle");
  const locale = useLocale() as ContentLanguage;
  const { user } = useAuth();
  const { scope } = useWorkspace();
  const { access } = useSubscription();
  const formatError = useFormatUserError();
  const workspaceOwnerId = scope?.ownerId ?? user?.uid ?? "";

  const [cycle, setCycle] = useState<EditorialCycle | null>(null);
  const [objective, setObjective] = useState<EditorialCycleObjective>("authority");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!workspaceOwnerId) return;
    try {
      const author = await getAuthorProfile(workspaceOwnerId);
      const active =
        author?.editorialCycle?.status === "active" ? author.editorialCycle : null;
      setCycle(active);
      if (active) setObjective(active.objective);
    } catch {
      setCycle(null);
    } finally {
      setLoaded(true);
    }
  }, [workspaceOwnerId]);

  useEffect(() => {
    void reload();
  }, [reload, scope?.accountId]);

  const generate = useCallback(async () => {
    if (!user || !workspaceOwnerId) return;
    setLoading(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const [persona, author, audience, llmProfile] = await Promise.all([
        getPersona(workspaceOwnerId),
        getAuthorProfile(workspaceOwnerId),
        getAudienceProfile(workspaceOwnerId),
        getUserLlmProfile(user.uid),
      ]);
      if (!token) {
        setError(formatError({ errorCode: "Unauthorized", fallbackMessage: t("generateFailed") }).message);
        return;
      }
      if (!persona?.promptText?.trim()) {
        setError(t("personaRequired"));
        return;
      }

      const res = await fetch("/api/articles/editorial-cycle", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          objective,
          contentLanguage: author?.contentLanguage ?? locale,
          personaPromptText: persona.promptText,
          contentNiche: audience?.contentNiche,
          roleTitle: author?.roleTitle,
          positioningLine: author?.positioningLine,
          strategyGuide: author?.creationStrategyCache?.guide,
          llm: llmPayloadForTier(llmProfile, access?.effectiveTier),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          formatError({
            errorCode: typeof data.error === "string" ? data.error : "llm_request_failed",
            detail: typeof data.detail === "string" ? data.detail : "",
            fallbackMessage: t("generateFailed"),
          }).message,
        );
        return;
      }
      const next = data.cycle as EditorialCycle;
      await saveAuthorProfile(workspaceOwnerId, { editorialCycle: next });
      setCycle(next);
    } catch {
      setError(t("generateFailed"));
    } finally {
      setLoading(false);
    }
  }, [
    user,
    workspaceOwnerId,
    objective,
    locale,
    access?.effectiveTier,
    formatError,
    t,
  ]);

  const dismiss = useCallback(async () => {
    if (!workspaceOwnerId || !cycle) return;
    const next = { ...cycle, status: "dismissed" as const };
    await saveAuthorProfile(workspaceOwnerId, { editorialCycle: next });
    setCycle(null);
  }, [workspaceOwnerId, cycle]);

  if (!loaded) return null;

  return (
    <section className="rounded-2xl border border-ns-primary/20 bg-ns-primary/5 p-5 shadow-sm">
      <p className={META_LABEL}>{t("eyebrow")}</p>
      <h2 className="mt-1 text-base font-bold text-ns-tertiary">{t("title")}</h2>
      <p className="mt-1 text-sm text-ns-secondary">{t("hint")}</p>

      {!cycle || cycle.status !== "active" ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {OBJECTIVES.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setObjective(id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  objective === id
                    ? "border-ns-primary bg-ns-primary text-black"
                    : "border-ns-alternate bg-white text-ns-tertiary hover:border-ns-primary/40"
                }`}
              >
                {t(`objectives.${id}`)}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void generate()}
            className={`${BTN_PRIMARY} disabled:opacity-50`}
          >
            {loading ? t("generating") : t("generateCta")}
          </button>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-ns-tertiary">
                {t(`objectives.${cycle.objective}`)}
              </p>
              {cycle.summary ? (
                <p className="mt-1 text-sm text-ns-secondary">{cycle.summary}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={BTN_SECONDARY} disabled={loading} onClick={() => void generate()}>
                {loading ? t("generating") : t("regenerate")}
              </button>
              <button type="button" className={BTN_SECONDARY} onClick={() => void dismiss()}>
                {t("dismiss")}
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {cycle.phases.map((phase, index) => (
              <div
                key={phase.id}
                className="rounded-xl border border-white/80 bg-white px-3 py-3 shadow-sm"
              >
                <p className={META_LABEL}>
                  {t("phaseLabel", { n: index + 1 })} · {phase.label}
                </p>
                <p className="mt-1 text-xs text-ns-secondary">{phase.intent}</p>
                <ul className="mt-3 space-y-2">
                  {phase.items.map((item) => (
                    <li key={item.id} className="rounded-lg border border-ns-alternate/50 bg-ns-brand-light/30 px-2.5 py-2">
                      <p className="text-sm font-semibold text-ns-tertiary">{item.title}</p>
                      <p className="mt-1 line-clamp-3 text-xs text-ns-secondary">{item.angle}</p>
                      {item.status === "used" ? (
                        <p className="mt-2 text-micro font-medium text-ns-secondary/70">{t("used")}</p>
                      ) : (
                        <Link
                          href={itemHref(cycle, item.id, item.title, item.angle)}
                          className="mt-2 inline-block text-xs font-semibold text-ns-tertiary underline"
                          onClick={() => {
                            const updated = markEditorialCycleItemUsed(cycle, item.id);
                            if (updated) {
                              void saveAuthorProfile(workspaceOwnerId, {
                                editorialCycle: updated,
                              }).then(() => setCycle(updated));
                            }
                          }}
                        >
                          {t("useCta")}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
      )}
    </section>
  );
}
