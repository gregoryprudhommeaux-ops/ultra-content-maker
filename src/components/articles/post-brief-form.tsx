"use client";

import {
 isObjectiveSelected,
 normalizePostBrief,
 objectivePriority,
 POST_OBJECTIVES,
 setRankedObjectivePriority,
 toggleRankedObjective,
} from "@/lib/articles/post-brief-objectives";
import { isPostBriefComplete, type WizardCreationMode } from "@/lib/prompts/post-brief";
import { FORM_SECTION_TITLE } from "@/lib/ui/nextstep";
import type {
 ArticleScope,
 BriefNicheCheck,
 ContentArchetype,
 GapAnswerValue,
 PostBrief,
 PostObjectivePriority,
} from "@/types/workspace";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import { PostAnglePicker } from "@/components/articles/creation/post-angle-picker";
import { ContextHelp } from "@/components/ui/context-help";
import { ImeSafeTextarea } from "@/components/ui/ime-safe-field";
import { useLocale, useTranslations } from "next-intl";

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
 contentArchetype?: ContentArchetype;
 profileEnrichment?: Record<string, GapAnswerValue>;
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
 contentArchetype = "expert",
 profileEnrichment,
}: Props) {
 const t = useTranslations("setup.articles.brief");
 const tBriefHelp = useTranslations("setup.articles.brief.help");
 const tCreate = useTranslations("setup.articles.create");
 const tHelp = useTranslations("setup.articles.help");
 const locale = useLocale();

 function set<K extends keyof PostBrief>(key: K, value: PostBrief[K]) {
 onChange(normalizePostBrief({ ...safeBrief, [key]: value }));
 }

 const safeBrief = normalizePostBrief(brief);

 const hasAnyBriefText = [safeBrief.problem, safeBrief.pointOfView, safeBrief.proof].some(
 (value) => value.trim().length > 0,
 );
 const richBrief = isPostBriefComplete(safeBrief);

 const problemFieldKey =
 wizardMode === "news"
 ? "problemNews"
 : wizardMode === "inspiration"
 ? "problemInspiration"
 : "problem";

 return (
 <section
 className="rounded-xl border border-gray-100 bg-white p-4 md:p-5 space-y-4"
 lang={locale}
 >
 <div>
 <h2 className={FORM_SECTION_TITLE}>{t("title")}</h2>
 <p className="mt-1 text-sm text-ns-secondary">
 {wizardMode === "profile" ? t("subtitle") : tCreate("briefSubtitleShort")}
 </p>
 <p className="mt-2 text-xs text-ns-secondary">{t("optionalHint")}</p>
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

 <PostAnglePicker
 brief={safeBrief}
 onChange={onChange}
 contentArchetype={contentArchetype}
 profileEnrichment={profileEnrichment}
 />

 <div className="rounded-xl border border-ns-primary/25 bg-gradient-to-br from-ns-brand-light/60 via-white to-white p-4 md:p-5">
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div className="flex items-center gap-2">
 <span className={LABEL_CLASS}>{t("objective")}</span>
 <ContextHelp label={tBriefHelp("objective.label")}>
 {tBriefHelp("objective.body")}
 </ContextHelp>
 </div>
 <span
 className="rounded-full border border-ns-primary/30 bg-white/90 px-2.5 py-1 text-[11px] font-bold tabular-nums text-ns-tertiary"
 aria-live="polite"
 >
 {t("objectivesSelectedCount", {
 count: safeBrief.objectives.length,
 max: 3,
 })}
 </span>
 </div>
 <p className="mt-1.5 text-xs text-ns-secondary text-pretty">{t("objectivesHint")}</p>
 <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
 {POST_OBJECTIVES.map((obj) => {
 const selected = isObjectiveSelected(safeBrief, obj);
 const priority = objectivePriority(safeBrief, obj);
 const atMax = safeBrief.objectives.length >= 3;
 const disabled = !selected && atMax;

 return (
 <div
 key={obj}
 className={[
 "overflow-hidden rounded-xl border bg-white text-left shadow-sm transition-all",
 selected
 ? "border-ns-primary ring-1 ring-ns-primary/25"
 : disabled
 ? "border-gray-100 opacity-50"
 : "border-gray-100 hover:border-ns-primary/40",
 ].join(" ")}
 >
 <button
 type="button"
 disabled={disabled}
 onClick={() => onChange(toggleRankedObjective(safeBrief, obj))}
 className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors disabled:cursor-not-allowed"
 aria-pressed={selected}
 >
 <span
 className={[
 "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-black transition-colors",
 selected
 ? "border-ns-primary bg-ns-primary text-black"
 : "border-gray-200 bg-white text-transparent",
 ].join(" ")}
 aria-hidden
 >
 ✓
 </span>
 <span className="min-w-0 flex-1">
 <span className="flex flex-wrap items-center gap-2">
 <span className="text-sm font-semibold text-ns-tertiary">
 {t(`objectives.${obj}`)}
 </span>
 {selected && priority === 1 && (
 <span className="rounded-sm bg-ns-primary px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-black">
 {t("primaryObjective")}
 </span>
 )}
 </span>
 <span className="mt-0.5 block text-xs font-medium leading-snug text-ns-secondary">
 {t(`objectiveDescriptions.${obj}`)}
 </span>
 </span>
 </button>
 {selected && priority != null && (
 <div
 className="flex items-center justify-between gap-2 border-t border-ns-primary/20 bg-ns-brand-light/50 px-3.5 py-2.5"
 role="group"
 aria-label={t("objectivePriorityFor", {
 objective: t(`objectives.${obj}`),
 })}
 >
 <span className="text-[10px] font-bold uppercase tracking-wide text-ns-secondary">
 {t("priorityLabel")}
 </span>
 <div className="flex items-center gap-1">
 {PRIORITIES.map((p) => (
 <button
 key={p}
 type="button"
 onClick={(event) => {
 event.stopPropagation();
 onChange(setRankedObjectivePriority(safeBrief, obj, p));
 }}
 className={[
 "flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold transition-colors",
 priority === p
 ? "border-ns-primary bg-ns-primary text-black shadow-sm"
 : "border-gray-200 bg-white text-ns-secondary hover:border-ns-primary/50",
 ].join(" ")}
 aria-pressed={priority === p}
 aria-label={t("priorityOption", { rank: p })}
 >
 {p}
 </button>
 ))}
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>
 {safeBrief.objectives.length >= 3 && (
 <p className="mt-3 rounded-lg border border-ns-primary/20 bg-white/80 px-3 py-2 text-xs font-medium text-ns-secondary">
 {t("objectivesMax")}
 </p>
 )}
 </div>

 <div>
 <div className="flex items-center gap-2">
 <label className={LABEL_CLASS} htmlFor="brief-problem">
 {t(`${problemFieldKey}Label`)}
 </label>
 <ContextHelp label={tBriefHelp(`${problemFieldKey}.label`)}>
 {tBriefHelp(`${problemFieldKey}.body`)}
 </ContextHelp>
 </div>
 <ImeSafeTextarea
 id="brief-problem"
 rows={2}
 value={safeBrief.problem}
 onValueChange={(value) => set("problem", value)}
 placeholder={t(`${problemFieldKey}Placeholder`)}
 className={`${INPUT_CLASS} mt-1`}
 lang={locale}
 />
 </div>

 <div>
 <label className={LABEL_CLASS} htmlFor="brief-pov">
 {t("pointOfView")}
 </label>
 <ImeSafeTextarea
 id="brief-pov"
 rows={2}
 value={safeBrief.pointOfView}
 onValueChange={(value) => set("pointOfView", value)}
 placeholder={t("pointOfViewPlaceholder")}
 className={`${INPUT_CLASS} mt-1`}
 lang={locale}
 />
 </div>

 <div>
 <div className="flex items-center gap-2">
 <label className={LABEL_CLASS} htmlFor="brief-proof">
 {t("proof")}
 </label>
 <ContextHelp label={tBriefHelp("proof.label")}>{tBriefHelp("proof.body")}</ContextHelp>
 </div>
 <ImeSafeTextarea
 id="brief-proof"
 rows={2}
 value={safeBrief.proof}
 onValueChange={(value) => set("proof", value)}
 placeholder={t("proofPlaceholder")}
 className={`${INPUT_CLASS} mt-1`}
 lang={locale}
 />
 </div>

 {hasAnyBriefText && !richBrief && (
 <p className="rounded-lg border border-ns-primary/15 bg-ns-brand-light/30 px-3 py-2 text-xs text-ns-secondary">
 {t("refinementTip")}
 </p>
 )}

 {richBrief && nicheCheck && (
 <div
 className={`rounded-lg border p-3 text-sm ${
 nicheCheck.isTooGeneric
 ? "border-amber-200 bg-amber-50"
 : "border-emerald-200/80 bg-emerald-50/50"
 }`}
 >
 <div className="flex flex-wrap items-center justify-between gap-2">
 <p className="font-semibold text-ns-tertiary">
 {t("niche.title")} · {nicheCheck.score}/10
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
