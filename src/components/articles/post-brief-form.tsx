"use client";

import {
  isObjectiveSelected,
  objectivePriority,
  POST_OBJECTIVES,
  setRankedObjectivePriority,
  toggleRankedObjective,
} from "@/lib/articles/post-brief-objectives";
import {
  isPostBriefComplete,
  isWizardBriefComplete,
  type WizardCreationMode,
} from "@/lib/prompts/post-brief";
import type {
  ArticleScope,
  BriefNicheCheck,
  PostBrief,
  PostObjectivePriority,
} from "@/types/workspace";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import { ContextHelp } from "@/components/ui/context-help";
import { useTranslations } from "next-intl";

const PRIORITIES: PostObjectivePriority[] = [1, 2, 3];

type Props = {
  brief: PostBrief;
  onChange: (brief: PostBrief) => void;
  nicheCheck?: BriefNicheCheck | null;
  onAnalyzeNiche?: () => void;
  nicheLoading?: boolean;
  /** Wizard: profile = full brief; news/inspiration = objective only required */
  wizardMode?: WizardCreationMode;
  showScope?: boolean;
  targetScope?: ArticleScope;
  onScopeChange?: (scope: ArticleScope) => void;
  briefSuggesting?: boolean;
};

export function PostBriefForm({
  brief,
  onChange,
  nicheCheck,
  onAnalyzeNiche,
  nicheLoading,
  wizardMode,
  showScope,
  targetScope = "generalist",
  onScopeChange,
  briefSuggesting,
}: Props) {
  const t = useTranslations("setup.articles.brief");
  const tBriefHelp = useTranslations("setup.articles.brief.help");
  const tCreate = useTranslations("setup.articles.create");
  const tHelp = useTranslations("setup.articles.help");

  function set<K extends keyof PostBrief>(key: K, value: PostBrief[K]) {
    onChange({ ...brief, [key]: value });
  }

  const complete = wizardMode
    ? isWizardBriefComplete(brief, wizardMode)
    : isPostBriefComplete(brief);

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-4 md:p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-ns-tertiary">{t("title")}</h2>
        <p className="mt-1 text-sm text-ns-secondary">
          {wizardMode === "profile" ? t("subtitle") : tCreate("briefSubtitleShort")}
        </p>
        {briefSuggesting && (
          <p className="mt-2 text-xs text-ns-secondary">{tCreate("briefSuggesting")}</p>
        )}
      </div>

      {showScope && onScopeChange && (
        <div>
          <div className="flex items-center gap-2">
            <span className={LABEL_CLASS}>{tCreate("scopeLabel")}</span>
            <ContextHelp label={tHelp("scope.label")}>{tHelp("scope.body")}</ContextHelp>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["generalist", "niche"] as const).map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => onScopeChange(scope)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  targetScope === scope
                    ? "border-ns-primary bg-ns-brand-light text-ns-tertiary"
                    : "border-gray-100 text-ns-secondary hover:border-ns-primary/40"
                }`}
              >
                {tCreate(`scope.${scope}`)}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-ns-secondary">{tCreate("scopeHint")}</p>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2">
          <span className={LABEL_CLASS}>{t("objective")}</span>
          <ContextHelp label={tBriefHelp("objective.label")}>
            {tBriefHelp("objective.body")}
          </ContextHelp>
        </div>
        <p className="mt-1 text-xs text-ns-secondary">{t("objectivesHint")}</p>
        <div className="mt-2 space-y-2">
          {POST_OBJECTIVES.map((obj) => {
            const selected = isObjectiveSelected(brief, obj);
            const priority = objectivePriority(brief, obj);
            const atMax = brief.objectives.length >= 3;

            return (
              <div
                key={obj}
                className="flex flex-wrap items-center gap-2"
              >
                <button
                  type="button"
                  disabled={!selected && atMax}
                  onClick={() => onChange(toggleRankedObjective(brief, obj))}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                    selected
                      ? "border-ns-primary bg-ns-brand-light text-ns-tertiary"
                      : "border-gray-100 text-ns-secondary hover:border-ns-primary/40"
                  }`}
                >
                  {t(`objectives.${obj}`)}
                </button>
                {selected && priority != null && (
                  <div
                    className="flex items-center gap-1"
                    role="group"
                    aria-label={t("objectivePriorityFor", {
                      objective: t(`objectives.${obj}`),
                    })}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-ns-secondary">
                      {t("priorityLabel")}
                    </span>
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          onChange(setRankedObjectivePriority(brief, obj, p))
                        }
                        className={`flex h-7 w-7 items-center justify-center rounded-md border text-xs font-bold transition-colors ${
                          priority === p
                            ? "border-ns-primary bg-ns-primary text-black"
                            : "border-gray-200 text-ns-secondary hover:border-ns-primary/50"
                        }`}
                        aria-pressed={priority === p}
                        aria-label={t("priorityOption", { rank: p })}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {brief.objectives.length >= 3 && (
          <p className="mt-2 text-xs text-ns-secondary">{t("objectivesMax")}</p>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2">
          <label className={LABEL_CLASS} htmlFor="brief-problem">
            {t("problem")}
          </label>
          <ContextHelp label={tBriefHelp("problem.label")}>{tBriefHelp("problem.body")}</ContextHelp>
        </div>
        <textarea
          id="brief-problem"
          rows={2}
          value={brief.problem}
          onChange={(e) => set("problem", e.target.value)}
          placeholder={t("problemPlaceholder")}
          className={`${INPUT_CLASS} mt-1`}
        />
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="brief-pov">
          {t("pointOfView")}
        </label>
        <textarea
          id="brief-pov"
          rows={2}
          value={brief.pointOfView}
          onChange={(e) => set("pointOfView", e.target.value)}
          placeholder={t("pointOfViewPlaceholder")}
          className={`${INPUT_CLASS} mt-1`}
        />
      </div>

      <div>
        <div className="flex items-center gap-2">
          <label className={LABEL_CLASS} htmlFor="brief-proof">
            {t("proof")}
          </label>
          <ContextHelp label={tBriefHelp("proof.label")}>{tBriefHelp("proof.body")}</ContextHelp>
        </div>
        <textarea
          id="brief-proof"
          rows={2}
          value={brief.proof}
          onChange={(e) => set("proof", e.target.value)}
          placeholder={t("proofPlaceholder")}
          className={`${INPUT_CLASS} mt-1`}
        />
      </div>

      {!complete && (
        <p className="text-xs text-amber-800">
          {wizardMode && wizardMode !== "profile"
            ? tCreate("incompleteObjective")
            : t("incomplete")}
        </p>
      )}

      {complete && nicheCheck && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            nicheCheck.isTooGeneric
              ? "border-amber-200 bg-amber-50"
              : "border-emerald-200/80 bg-emerald-50/50"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-ns-tertiary">
              {t("niche.title")} — {nicheCheck.score}/10
            </p>
            {onAnalyzeNiche && (
              <button
                type="button"
                disabled={nicheLoading}
                onClick={onAnalyzeNiche}
                className="text-xs font-medium text-ns-tertiary underline hover:text-ns-primary disabled:opacity-50"
              >
                {nicheLoading ? "…" : t("niche.deepen")}
              </button>
            )}
          </div>
          <p className="mt-2 text-ns-secondary">
            {nicheCheck.feedback.startsWith("brief_")
              ? t(`niche.feedback.${nicheCheck.feedback}`)
              : nicheCheck.feedback}
          </p>
          {nicheCheck.isTooGeneric && (
            <p className="mt-2 text-xs font-medium text-amber-900">{t("niche.warning")}</p>
          )}
          {nicheCheck.suggestions && nicheCheck.suggestions.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-ns-secondary">
              {nicheCheck.suggestions.map((s, i) => (
                <li key={i}>
                  {s.startsWith("add_") || s.startsWith("remove_") || s.startsWith("detail_")
                    ? t(`niche.suggestions.${s}`)
                    : s}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
