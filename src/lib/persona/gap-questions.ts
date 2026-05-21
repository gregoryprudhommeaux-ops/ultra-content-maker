import { getAudienceProfile, saveAudienceProfile } from "@/lib/workspace/audience";
import { getAuthorProfile, saveAuthorProfile } from "@/lib/workspace/author";
import { saveProfileEnrichment } from "@/lib/workspace/enrichment";
import type {
  GapAnswerValue,
  GapQuestionField,
  ProfileGapQuestion,
} from "@/types/workspace";

const AUTHOR_KEYS = new Set(["roleTitle", "positioningLine"]);
const AUDIENCE_KEYS = new Set(["targetLabel", "contentFocus", "optionalNotes"]);

function answerToString(value: GapAnswerValue): string {
  return Array.isArray(value) ? value.filter(Boolean).join(", ") : value.trim();
}

function isNonEmpty(value: GapAnswerValue | undefined): boolean {
  if (value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  return value.trim().length > 0;
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
      const type = q.type as ProfileGapQuestion["type"];
      if (!id || !label) continue;
      if (!["author", "audience", "enrichment"].includes(field)) continue;
      if (!["single", "multi", "text"].includes(type)) continue;
      const options = Array.isArray(q.options)
        ? q.options.filter((o): o is string => typeof o === "string")
        : undefined;
      out.push({
        id,
        field,
        profileKey,
        label,
        hint: typeof q.hint === "string" ? q.hint : undefined,
        type,
        options: options?.length ? options : undefined,
      });
    }
    if (out.length > 0) return out.slice(0, 12);
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
    if (!isNonEmpty(value)) continue;
    const text = answerToString(value!);

    if (q.field === "author" && AUTHOR_KEYS.has(q.profileKey)) {
      authorPatch[q.profileKey] = text;
      continue;
    }
    if (q.field === "audience" && AUDIENCE_KEYS.has(q.profileKey)) {
      audiencePatch[q.profileKey] = text;
      continue;
    }
    enrichmentPatch[q.profileKey] = value!;
  }

  if (Object.keys(enrichmentPatch).length > 0) {
    await saveProfileEnrichment(userId, enrichmentPatch);
  }

  if (Object.keys(authorPatch).length > 0) {
    await saveAuthorProfile(userId, {
      linkedinProfileUrl: author?.linkedinProfileUrl,
      websiteUrl: author?.websiteUrl,
      blogUrl: author?.blogUrl,
      contentLanguage: author?.contentLanguage ?? "fr",
      roleTitle: authorPatch.roleTitle ?? author?.roleTitle,
      positioningLine: authorPatch.positioningLine ?? author?.positioningLine,
      status: author?.status ?? "in_progress",
    });
  }

  if (Object.keys(audiencePatch).length > 0) {
    await saveAudienceProfile(userId, {
      targetLabel: audiencePatch.targetLabel ?? audience?.targetLabel,
      contentFocus: audiencePatch.contentFocus ?? audience?.contentFocus,
      optionalNotes: audiencePatch.optionalNotes ?? audience?.optionalNotes,
      skipped: audience?.skipped,
    });
  }
}
