import type {
  PostBrief,
  PostObjective,
  PostObjectivePriority,
  RankedPostObjective,
} from "@/types/workspace";

export const POST_OBJECTIVES: PostObjective[] = [
  "credibility",
  "conversation",
  "awareness",
  "leads",
];

export const MAX_RANKED_OBJECTIVES = 3;

function isObjective(v: unknown): v is PostObjective {
  return (
    v === "awareness" ||
    v === "credibility" ||
    v === "conversation" ||
    v === "leads"
  );
}

function isPriority(v: unknown): v is PostObjectivePriority {
  return v === 1 || v === 2 || v === 3;
}

export function sortObjectivesByPriority(
  objectives: RankedPostObjective[],
): RankedPostObjective[] {
  return [...objectives].sort((a, b) => a.priority - b.priority);
}

function dedupeObjectives(objectives: RankedPostObjective[]): RankedPostObjective[] {
  const seen = new Set<PostObjective>();
  const out: RankedPostObjective[] = [];
  for (const item of sortObjectivesByPriority(objectives)) {
    if (seen.has(item.objective)) continue;
    seen.add(item.objective);
    out.push(item);
    if (out.length >= MAX_RANKED_OBJECTIVES) break;
  }
  return out.map((item, index) => ({
    objective: item.objective,
    priority: (index + 1) as PostObjectivePriority,
  }));
}

/** Merge legacy `objective` field and normalize ranked objectives from storage/API. */
export function normalizePostBrief(raw: unknown): PostBrief {
  const partial =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const problem = typeof partial?.problem === "string" ? partial.problem : "";
  const pointOfView =
    typeof partial?.pointOfView === "string" ? partial.pointOfView : "";
  const proof = typeof partial?.proof === "string" ? partial.proof : "";

  let objectives: RankedPostObjective[] = [];
  if (Array.isArray(partial?.objectives)) {
    objectives = dedupeObjectives(
      partial.objectives
        .filter(
          (item): item is RankedPostObjective =>
            !!item &&
            typeof item === "object" &&
            isObjective((item as RankedPostObjective).objective) &&
            isPriority((item as RankedPostObjective).priority),
        )
        .map((item) => ({
          objective: item.objective,
          priority: item.priority,
        })),
    );
  } else if (isObjective(partial?.objective)) {
    objectives = [{ objective: partial.objective, priority: 1 }];
  }

  return { objectives, problem, pointOfView, proof };
}

export function primaryPostObjective(brief: PostBrief): PostObjective {
  return (
    sortObjectivesByPriority(brief.objectives)[0]?.objective ?? "credibility"
  );
}

export function hasPostObjectives(brief: PostBrief): boolean {
  return brief.objectives.length > 0;
}

export function toggleRankedObjective(
  brief: PostBrief,
  objective: PostObjective,
): PostBrief {
  const existing = brief.objectives.find((o) => o.objective === objective);
  if (existing) {
    const remaining = brief.objectives.filter((o) => o.objective !== objective);
    return {
      ...brief,
      objectives: remaining.map((item, index) => ({
        objective: item.objective,
        priority: (index + 1) as PostObjectivePriority,
      })),
    };
  }

  if (brief.objectives.length >= MAX_RANKED_OBJECTIVES) {
    return brief;
  }

  const usedPriorities = new Set(brief.objectives.map((o) => o.priority));
  const nextPriority =
    ([1, 2, 3] as const).find((p) => !usedPriorities.has(p)) ?? 3;

  return {
    ...brief,
    objectives: sortObjectivesByPriority([
      ...brief.objectives,
      { objective, priority: nextPriority },
    ]),
  };
}

export function setRankedObjectivePriority(
  brief: PostBrief,
  objective: PostObjective,
  priority: PostObjectivePriority,
): PostBrief {
  const index = brief.objectives.findIndex((o) => o.objective === objective);
  if (index < 0) return brief;

  const objectives = [...brief.objectives];
  const current = objectives[index];
  const otherIndex = objectives.findIndex(
    (o) => o.priority === priority && o.objective !== objective,
  );

  if (otherIndex >= 0) {
    objectives[otherIndex] = {
      ...objectives[otherIndex],
      priority: current.priority,
    };
  }

  objectives[index] = { ...current, priority };
  return { ...brief, objectives: sortObjectivesByPriority(objectives) };
}

export function isObjectiveSelected(
  brief: PostBrief,
  objective: PostObjective,
): boolean {
  return brief.objectives.some((o) => o.objective === objective);
}

export function objectivePriority(
  brief: PostBrief,
  objective: PostObjective,
): PostObjectivePriority | null {
  return brief.objectives.find((o) => o.objective === objective)?.priority ?? null;
}
