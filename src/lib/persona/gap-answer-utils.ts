import type { GapAnswerValue } from "@/types/workspace";

/** Sentinel stored in single/multi answers when "Other" is selected. */
export const GAP_OTHER_VALUE = "__other__";

export const MAX_MULTI_GAP_SELECTIONS = 3;

export function gapOtherAnswerKey(questionId: string): string {
  return `${questionId}__other`;
}

export function getGapOtherText(
  answers: Record<string, GapAnswerValue>,
  questionId: string,
): string {
  const raw = answers[gapOtherAnswerKey(questionId)];
  return typeof raw === "string" ? raw : "";
}

export function isGapOtherSelected(value: GapAnswerValue | undefined): boolean {
  if (value === GAP_OTHER_VALUE) return true;
  return Array.isArray(value) && value.includes(GAP_OTHER_VALUE);
}

export function countGapMultiSelections(value: GapAnswerValue | undefined): number {
  if (!value) return 0;
  if (Array.isArray(value)) return value.length;
  return value === GAP_OTHER_VALUE || String(value).trim() ? 1 : 0;
}

export function formatGapAnswerText(
  value: GapAnswerValue | undefined,
  otherText?: string,
): string {
  const other = otherText?.trim() ?? "";
  if (value === undefined) return other;
  if (Array.isArray(value)) {
    const parts = value
      .filter((item) => item !== GAP_OTHER_VALUE)
      .map((item) => item.trim())
      .filter(Boolean);
    if (value.includes(GAP_OTHER_VALUE) && other) parts.push(other);
    return parts.join(", ");
  }
  if (value === GAP_OTHER_VALUE) return other;
  const base = String(value).trim();
  return base;
}

export function resolveGapAnswerValue(
  value: GapAnswerValue | undefined,
  otherText?: string,
): GapAnswerValue | undefined {
  const formatted = formatGapAnswerText(value, otherText);
  if (!formatted) return undefined;
  if (Array.isArray(value)) {
    const parts = formatted.split(", ").map((part) => part.trim()).filter(Boolean);
    return parts.length === 1 ? parts[0] : parts;
  }
  return formatted;
}

export function formatRankedGapAnswer(items: string[]): string {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, index) => `${index + 1}. ${item}`)
    .join(" · ");
}

export function buildInitialRankOrder(
  options: string[],
  stored?: GapAnswerValue,
): string[] {
  if (Array.isArray(stored) && stored.length > 0) {
    const ranked = stored.map((item) => String(item).trim()).filter(Boolean);
    const missing = options.filter((option) => !ranked.includes(option));
    return [...ranked, ...missing];
  }
  if (typeof stored === "string" && stored.trim()) {
    const first = stored.trim();
    return [first, ...options.filter((option) => option !== first)];
  }
  return [...options];
}

export function isLinkedInGoalGapQuestion(question: {
  id: string;
  profileKey: string;
  label: string;
}): boolean {
  if (question.profileKey === "linkedin_quarterly_goal") return true;
  const hay = `${question.id} ${question.profileKey} ${question.label}`.toLowerCase();
  return hay.includes("linkedin") && hay.includes("goal");
}

export function isGapAnswerNonEmpty(
  value: GapAnswerValue | undefined,
  otherText?: string,
): boolean {
  return formatGapAnswerText(value, otherText).length > 0;
}
