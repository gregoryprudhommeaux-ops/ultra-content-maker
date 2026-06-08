import {
  hasPostObjectivesFromUnknown,
  normalizePostBrief,
  sortObjectivesByPriority,
} from "@/lib/articles/post-brief-objectives";
import type { ContentLanguage, PostBrief, PostObjective } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

const OBJECTIVE_LABELS: Record<PostObjective, string> = {
  awareness: "visibility / reach",
  credibility: "credibility / authority",
  conversation: "qualified conversation in comments",
  leads: "inbound interest (DMs, calls)",
};

function formatObjectivesBlock(brief: PostBrief): string {
  const ranked = sortObjectivesByPriority(brief.objectives ?? []);
  if (ranked.length === 0) return "- Objectives: (none)";

  return ranked
    .map(
      ({ objective, priority }) =>
        `- Priority ${priority}: ${objective} — ${OBJECTIVE_LABELS[objective]}`,
    )
    .join("\n");
}

export function buildPostBriefInstruction(
  brief: PostBrief,
  contentLanguage: ContentLanguage,
): string {
  const normalized = normalizePostBrief(brief);
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
  const objectivesBlock = formatObjectivesBlock(normalized);
  const primary = sortObjectivesByPriority(normalized.objectives)[0]?.objective;

  return `POST BRIEF (mandatory — all ${lang} posts in this batch must follow):
${objectivesBlock}
- Primary objective (priority 1) drives hook, body shape, and closing; secondary objectives may appear subtly but must not dilute the main intent.
- Audience problem: ${normalized.problem.trim()}
- Author point of view: ${normalized.pointOfView.trim()}
- Proof to weave in (required): ${normalized.proof.trim()}

Each post must visibly reflect the problem, POV, and proof. Match the ranked objectives in hook, body shape, and closing (no hard-sell CTA block — user adds a signature CTA later; body ending must not duplicate that CTA's opener).${
    primary === "conversation"
      ? " When conversation is ranked, end with a specific question for the target ICP."
      : ""
  }`;
}

export function isPostBriefComplete(brief: PostBrief): boolean {
  const normalized = normalizePostBrief(brief);
  return (
    hasPostObjectivesFromUnknown(normalized) &&
    normalized.problem.trim().length >= 8 &&
    normalized.pointOfView.trim().length >= 8 &&
    normalized.proof.trim().length >= 8
  );
}

export type WizardCreationMode = "profile" | "news" | "inspiration";

/** Profile = full brief; news/inspiration = objective required (other fields optional, often AI-prefilled). */
export function isWizardBriefComplete(
  brief: PostBrief,
  mode: WizardCreationMode,
): boolean {
  if (mode === "profile") return isPostBriefComplete(brief);
  return hasPostObjectivesFromUnknown(brief);
}
