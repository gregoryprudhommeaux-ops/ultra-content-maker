import { getAudienceProfile, saveAudienceProfile } from "@/lib/workspace/audience";
import { getAuthorProfile, saveAuthorProfile } from "@/lib/workspace/author";
import { saveProfileEnrichment } from "@/lib/workspace/enrichment";
import type {
  GapAnswerValue,
  GapQuestionField,
  ProfileGapQuestion,
} from "@/types/workspace";
import {
  formatGapAnswerText,
  formatRankedGapAnswer,
  gapOtherAnswerKey,
  getGapOtherText,
  isGapAnswerNonEmpty,
  isLinkedInGoalGapQuestion,
  buildInitialRankOrder,
  resolveGapAnswerValue,
} from "./gap-answer-utils";

const AUTHOR_KEYS = new Set(["roleTitle", "positioningLine"]);
const AUDIENCE_KEYS = new Set(["targetLabel", "contentFocus", "optionalNotes"]);

function answerToString(
  value: GapAnswerValue,
  otherText?: string,
): string {
  return formatGapAnswerText(value, otherText);
}

function isNonEmpty(
  value: GapAnswerValue | undefined,
  otherText?: string,
): boolean {
  return isGapAnswerNonEmpty(value, otherText);
}

export function normalizeGapQuestions(
  gapQuestions: unknown,
  legacyGaps: unknown,
): ProfileGapQuestion[] {
  if (Array.isArray(gapQuestions) && gapQuestions.length > 0) {
    const out: ProfileGapQuestion[] = [];
    for (const raw of gapQuestions) {
      if (!raw || typeof raw !== "object") continue;
      const q = raw as Record<string, unknown>;
      const id = typeof q.id === "string" ? q.id : "";
      const label = typeof q.label === "string" ? q.label : "";
      const field = q.field as GapQuestionField;
      const profileKey = typeof q.profileKey === "string" ? q.profileKey : id;
      let type = q.type as ProfileGapQuestion["type"];
      if (!id || !label) continue;
      if (!["author", "audience", "enrichment"].includes(field)) continue;
      const options = Array.isArray(q.options)
        ? q.options.filter((o): o is string => typeof o === "string")
        : undefined;
      if (
        options?.length &&
        (type === "single" || type === "multi") &&
        isLinkedInGoalGapQuestion({ id, profileKey, label })
      ) {
        type = "rank";
      }
      if (!["single", "multi", "text", "rank"].includes(type)) continue;
      if ((type === "single" || type === "multi" || type === "rank") && !options?.length) {
        continue;
      }
      out.push({
        id,
        field,
        profileKey,
        label,
        hint: typeof q.hint === "string" ? q.hint : undefined,
        type,
        options,
      });
    }
    if (out.length > 0) return out.slice(0, 12).map(normalizeGapQuestionItem);
  }

  if (!Array.isArray(legacyGaps)) return [];
  return legacyGaps
    .filter((g): g is string => typeof g === "string" && g.trim().length > 0)
    .slice(0, 12)
    .map((label, i) => ({
      id: `gap_${i}`,
      field: "enrichment" as const,
      profileKey: `gap_${i}`,
      label: label.trim(),
      type: "text" as const,
    }));
}

export function normalizeGapQuestionItem(q: ProfileGapQuestion): ProfileGapQuestion {
  if (
    q.options?.length &&
    (q.type === "single" || q.type === "multi") &&
    isLinkedInGoalGapQuestion(q)
  ) {
    return { ...q, type: "rank" };
  }
  return q;
}

export async function applyGapAnswers(
  userId: string,
  questions: ProfileGapQuestion[],
  answers: Record<string, GapAnswerValue>,
) {
  const author = await getAuthorProfile(userId);
  const audience = await getAudienceProfile(userId);
  const enrichmentPatch: Record<string, GapAnswerValue> = {};

  const authorPatch: Record<string, string> = {};
  const audiencePatch: Record<string, string> = {};

  for (const q of questions) {
    const value = answers[q.id];
    const otherText = getGapOtherText(answers, q.id);

    if (q.type === "rank") {
      const ranked = buildInitialRankOrder(q.options ?? [], value);
      if (ranked.length === 0) continue;
      const text = formatRankedGapAnswer(ranked);
      if (q.field === "author" && AUTHOR_KEYS.has(q.profileKey)) {
        authorPatch[q.profileKey] = text;
        continue;
      }
      if (q.field === "audience" && AUDIENCE_KEYS.has(q.profileKey)) {
        audiencePatch[q.profileKey] = text;
        continue;
      }
      enrichmentPatch[q.profileKey] = ranked;
      continue;
    }

    if (!isNonEmpty(value, otherText)) continue;
    const resolved = resolveGapAnswerValue(value, otherText);
    if (!resolved) continue;
    const text = answerToString(value, otherText);

    if (q.field === "author" && AUTHOR_KEYS.has(q.profileKey)) {
      authorPatch[q.profileKey] = text;
      continue;
    }
    if (q.field === "audience" && AUDIENCE_KEYS.has(q.profileKey)) {
      audiencePatch[q.profileKey] = text;
      continue;
    }
    enrichmentPatch[q.profileKey] = resolved;
    if (otherText.trim()) {
      enrichmentPatch[gapOtherAnswerKey(q.profileKey)] = otherText.trim();
    }
  }

  const writes: Promise<unknown>[] = [];

  if (Object.keys(enrichmentPatch).length > 0) {
    writes.push(saveProfileEnrichment(userId, enrichmentPatch));
  }

  if (Object.keys(authorPatch).length > 0) {
    writes.push(
      saveAuthorProfile(userId, {
        linkedinProfileUrl: author?.linkedinProfileUrl,
        websiteUrl: author?.websiteUrl,
        blogUrl: author?.blogUrl,
        contentLanguage: author?.contentLanguage ?? "fr",
        roleTitle: authorPatch.roleTitle ?? author?.roleTitle,
        positioningLine: authorPatch.positioningLine ?? author?.positioningLine,
        status: author?.status ?? "in_progress",
      }),
    );
  }

  if (Object.keys(audiencePatch).length > 0) {
    writes.push(
      saveAudienceProfile(userId, {
        targetLabel: audiencePatch.targetLabel ?? audience?.targetLabel,
        contentFocus: audiencePatch.contentFocus ?? audience?.contentFocus,
        optionalNotes: audiencePatch.optionalNotes ?? audience?.optionalNotes,
        skipped: audience?.skipped,
      }),
    );
  }

  if (writes.length > 0) {
    await Promise.all(writes);
  }
}
