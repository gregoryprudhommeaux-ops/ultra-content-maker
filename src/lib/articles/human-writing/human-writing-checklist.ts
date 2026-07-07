import type { ContentLanguage } from "@/types/workspace";
import {
  lintHumanWriting,
  type HumanWritingCategory,
  type HumanWritingViolation,
  type ViolationSeverity,
} from "./human-writing-lint";

export type ChecklistStatus = "pass" | "warn" | "fail";

export interface CategoryChecklistResult {
  status: ChecklistStatus;
  violations: string[];
}

export interface HumanWritingChecklistResult {
  passed: boolean;
  score: number;
  categories: Record<HumanWritingCategory, CategoryChecklistResult>;
  violations: HumanWritingViolation[];
  autoFixable: boolean;
  summary: "empty" | "clean" | "needs_work" | "critical";
}

const CATEGORIES: HumanWritingCategory[] = [
  "ai_tics",
  "punctuation",
  "emojis",
  "paragraphs",
  "voice",
];

function severityWeight(severity: ViolationSeverity): number {
  if (severity === "error") return 3;
  if (severity === "warn") return 1.5;
  return 0.5;
}

function categoryStatus(violations: HumanWritingViolation[]): ChecklistStatus {
  if (violations.some((v) => v.severity === "error")) return "fail";
  if (violations.some((v) => v.severity === "warn")) return "warn";
  return "pass";
}

const AUTO_FIXABLE_IDS = new Set([
  "em_dash_overuse",
  "triple_adjectives",
  "two_sentence_blocks",
  "emoji_count",
  "emoji_line_start",
  "not_x_its_y",
  "uniform_sentence_rhythm",
  "uniform_paragraph_size",
]);

function isAutoFixable(violation: HumanWritingViolation): boolean {
  if (AUTO_FIXABLE_IDS.has(violation.id)) return true;
  return violation.id.startsWith("banned_");
}

/** Run structured pre-publication checklist on post text. */
export function runHumanWritingChecklist(
  text: string,
  options: { contentLanguage?: ContentLanguage } = {},
): HumanWritingChecklistResult {
  const combined = text.trim();
  if (!combined) {
    const emptyCategories: Record<HumanWritingCategory, CategoryChecklistResult> = {
      ai_tics: { status: "pass", violations: [] },
      punctuation: { status: "pass", violations: [] },
      emojis: { status: "pass", violations: [] },
      paragraphs: { status: "pass", violations: [] },
      voice: { status: "pass", violations: [] },
    };

    return {
      passed: true,
      score: 10,
      categories: emptyCategories,
      violations: [],
      autoFixable: false,
      summary: "empty",
    };
  }

  const violations = lintHumanWriting(combined, options);
  const penalty = violations.reduce((sum, v) => sum + severityWeight(v.severity), 0);
  const score = Math.min(10, Math.max(1, Math.round(10 - penalty)));

  const categories = Object.fromEntries(
    CATEGORIES.map((category) => {
      const catViolations = violations.filter((v) => v.category === category);
      return [
        category,
        {
          status: categoryStatus(catViolations),
          violations: catViolations.map((v) => v.id),
        },
      ];
    }),
  ) as Record<HumanWritingCategory, CategoryChecklistResult>;

  const hasErrors = violations.some((v) => v.severity === "error");
  const hasWarnings = violations.some((v) => v.severity === "warn");
  const summary: HumanWritingChecklistResult["summary"] = hasErrors
    ? "critical"
    : hasWarnings
      ? "needs_work"
      : "clean";

  return {
    passed: !hasErrors,
    score,
    categories,
    violations,
    autoFixable: violations.some(isAutoFixable),
    summary,
  };
}
