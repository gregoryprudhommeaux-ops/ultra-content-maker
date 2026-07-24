import { buildAntiLinkedInSlopRules } from "@/lib/prompts/anti-linkedin-slop";
import { languageLabel, languageOnlyRule } from "@/lib/prompts/language-consistency";
import type {
  ContentLanguage,
  CreationStrategyGuide,
  EditorialCycle,
  EditorialCycleItem,
  EditorialCycleObjective,
  EditorialCyclePhase,
} from "@/types/workspace";

const OBJECTIVES: EditorialCycleObjective[] = [
  "authority",
  "launch",
  "conversion",
  "reposition",
];

export function isEditorialCycleObjective(v: unknown): v is EditorialCycleObjective {
  return typeof v === "string" && OBJECTIVES.includes(v as EditorialCycleObjective);
}

export function buildEditorialCycleSystemPrompt(contentLanguage: ContentLanguage): string {
  const lang = languageLabel(contentLanguage);
  return `You design a short LinkedIn editorial cycle (${lang}) for a B2B author.

${languageOnlyRule(contentLanguage)}
${buildAntiLinkedInSlopRules(contentLanguage)}

Return JSON only:
{
  "summary": string,
  "phases": [
    {
      "id": "phase1" | "phase2" | "phase3" | "phase4",
      "label": string,
      "intent": string,
      "items": [
        {
          "id": string,
          "title": string,
          "angle": string,
          "rationale": string,
          "suggestedMode": "profile" | "news" | "inspiration" | "article"
        }
      ]
    }
  ]
}

Rules:
- Exactly 4 phases that progress toward the business objective (open → deepen → prove → convert/close — adapt labels to the objective)
- Each phase has 1 or 2 items (max 2) — keep the cycle light (4–8 posts total), not a rigid 16-post plan
- title = short post theme; angle = specific POV usable as a brief pointOfView
- Ground in Persona / Topic DNA / niche; never invent fake metrics or client stories
- Prefer concrete, author-owned angles over generic LinkedIn advice
- suggestedMode: usually "profile"; use "news" only if a timely reaction fits; "inspiration" rarely
- All user-facing strings in ${lang}`;
}

export function buildEditorialCycleUserPrompt(input: {
  objective: EditorialCycleObjective;
  personaExcerpt: string;
  contentNiche?: string | null;
  roleTitle?: string | null;
  positioningLine?: string | null;
  strategyGuide?: CreationStrategyGuide | null;
}): string {
  return JSON.stringify(
    {
      objective: input.objective,
      personaExcerpt: input.personaExcerpt.slice(0, 6000),
      contentNiche: input.contentNiche?.trim() || null,
      roleTitle: input.roleTitle?.trim() || null,
      positioningLine: input.positioningLine?.trim() || null,
      strategyContext: input.strategyGuide
        ? {
            patternSummary: input.strategyGuide.patternSummary,
            recommendedMode: input.strategyGuide.recommendedMode,
            themes: input.strategyGuide.themes.slice(0, 3).map((t) => ({
              title: t.title,
              angle: t.angle,
            })),
          }
        : null,
    },
    null,
    2,
  );
}

function normalizeItem(
  raw: unknown,
  phaseIndex: number,
  itemIndex: number,
): EditorialCycleItem | null {
  if (!raw || typeof raw !== "object") return null;
  const title = String((raw as { title?: unknown }).title ?? "").trim();
  const angle = String((raw as { angle?: unknown }).angle ?? "").trim();
  if (title.length < 3 || angle.length < 8) return null;
  const mode = (raw as { suggestedMode?: unknown }).suggestedMode;
  const suggestedMode =
    mode === "profile" ||
    mode === "news" ||
    mode === "inspiration" ||
    mode === "article"
      ? mode
      : "profile";
  const id =
    String((raw as { id?: unknown }).id ?? "").trim() ||
    `p${phaseIndex + 1}-i${itemIndex + 1}`;
  const rationale = String((raw as { rationale?: unknown }).rationale ?? "").trim();
  return {
    id,
    title,
    angle,
    rationale: rationale || undefined,
    suggestedMode,
    status: "queued",
  };
}

function normalizePhase(raw: unknown, index: number): EditorialCyclePhase | null {
  if (!raw || typeof raw !== "object") return null;
  const label = String((raw as { label?: unknown }).label ?? "").trim();
  const intent = String((raw as { intent?: unknown }).intent ?? "").trim();
  if (label.length < 2) return null;
  const itemsRaw = (raw as { items?: unknown }).items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw
        .map((item, i) => normalizeItem(item, index, i))
        .filter((item): item is EditorialCycleItem => item != null)
        .slice(0, 2)
    : [];
  if (items.length === 0) return null;
  const id =
    String((raw as { id?: unknown }).id ?? "").trim() || `phase${index + 1}`;
  return { id, label, intent: intent || label, items };
}

export function normalizeEditorialCycle(
  objective: EditorialCycleObjective,
  raw: { summary?: unknown; phases?: unknown },
): EditorialCycle | null {
  const phasesRaw = Array.isArray(raw.phases) ? raw.phases : [];
  const phases = phasesRaw
    .map((phase, i) => normalizePhase(phase, i))
    .filter((phase): phase is EditorialCyclePhase => phase != null)
    .slice(0, 4);
  if (phases.length < 4) return null;
  return {
    objective,
    status: "active",
    createdAt: new Date().toISOString(),
    summary:
      typeof raw.summary === "string" && raw.summary.trim()
        ? raw.summary.trim()
        : undefined,
    phases,
  };
}

/** Mark a cycle item used; returns updated cycle or null if not found. */
export function markEditorialCycleItemUsed(
  cycle: EditorialCycle,
  itemId: string,
): EditorialCycle | null {
  let found = false;
  const phases = cycle.phases.map((phase) => ({
    ...phase,
    items: phase.items.map((item) => {
      if (item.id !== itemId) return item;
      found = true;
      return { ...item, status: "used" as const };
    }),
  }));
  if (!found) return null;
  const allUsed = phases.every((p) => p.items.every((i) => i.status === "used"));
  return {
    ...cycle,
    phases,
    status: allUsed ? "completed" : cycle.status,
  };
}

export function defaultPostObjectiveForCycle(
  objective: EditorialCycleObjective,
): "credibility" | "conversation" | "awareness" | "leads" {
  switch (objective) {
    case "authority":
      return "credibility";
    case "launch":
      return "awareness";
    case "conversion":
      return "leads";
    case "reposition":
      return "conversation";
  }
}
