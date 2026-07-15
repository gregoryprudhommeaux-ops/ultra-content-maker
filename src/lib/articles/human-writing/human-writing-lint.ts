import type { ContentLanguage } from "@/types/workspace";
import {
  BANNED_PHRASES_BY_LANG,
  FIRST_PERSON_RE,
  OPINION_MARKERS,
  STRUCTURAL_PATTERN_RULES,
} from "./banned-phrases";

export type HumanWritingCategory =
  | "ai_tics"
  | "punctuation"
  | "emojis"
  | "paragraphs"
  | "voice";

export type ViolationSeverity = "error" | "warn" | "info";

export interface HumanWritingViolation {
  id: string;
  category: HumanWritingCategory;
  severity: ViolationSeverity;
  message: string;
  detail?: string;
}

const EMOJI_RE = /\p{Extended_Pictographic}/gu;

function countEmDashes(text: string): number {
  return (text.match(/—/g) ?? []).length;
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function countSentences(block: string): number {
  const cleaned = block.replace(/\n+/g, " ").trim();
  if (!cleaned) return 0;
  const parts = cleaned.split(/(?<=[.!?…])\s+/).filter((s) => s.trim().length > 0);
  return parts.length || 1;
}

function sentenceLengths(text: string): number[] {
  const sentences = text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.map((s) => s.split(/\s+/).filter(Boolean).length);
}

function countEmoji(text: string): number {
  return [...text.matchAll(EMOJI_RE)].length;
}

function linesWithLeadingEmoji(text: string): number {
  return text
    .split("\n")
    .filter((line) => /^\s*\p{Extended_Pictographic}/u.test(line)).length;
}

function emojiLineRatio(text: string): number {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return 0;
  const withEmoji = lines.filter((l) => EMOJI_RE.test(l)).length;
  return withEmoji / lines.length;
}

function emojiSentenceRatio(text: string): number {
  const sentences = text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?…])\s+/)
    .filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return 0;
  const withEmoji = sentences.filter((s) => EMOJI_RE.test(s)).length;
  return withEmoji / sentences.length;
}

function detectBannedPhrases(
  text: string,
  contentLanguage: ContentLanguage,
): HumanWritingViolation[] {
  const violations: HumanWritingViolation[] = [];
  const lower = text.toLowerCase();
  const phrases = BANNED_PHRASES_BY_LANG[contentLanguage] ?? BANNED_PHRASES_BY_LANG.en;

  for (const { id, phrase } of phrases) {
    if (lower.includes(phrase.toLowerCase())) {
      violations.push({
        id: `banned_${id}`,
        category: "ai_tics",
        severity: "error",
        message: `Banned phrase: "${phrase}"`,
      });
    }
  }
  return violations;
}

function detectStructuralPatterns(text: string): HumanWritingViolation[] {
  const violations: HumanWritingViolation[] = [];

  for (const rule of STRUCTURAL_PATTERN_RULES) {
    const matches = [...text.matchAll(rule.re)];
    if (matches.length === 0) continue;

    if (rule.maxAllowed !== undefined && matches.length > rule.maxAllowed) {
      violations.push({
        id: rule.id,
        category: "ai_tics",
        severity: "error",
        message: `"Not X, it's Y" pattern used ${matches.length} times (max ${rule.maxAllowed})`,
        detail: matches[0]?.[0],
      });
    } else if (rule.id === "triple_adjectives" && matches.length > 0) {
      violations.push({
        id: rule.id,
        category: "ai_tics",
        severity: "warn",
        message: `Triple-adjective stack detected (${matches.length})`,
        detail: matches[0]?.[0],
      });
    }
  }

  return violations;
}

function detectPunctuationIssues(text: string): HumanWritingViolation[] {
  const violations: HumanWritingViolation[] = [];
  const emCount = countEmDashes(text);

  if (emCount > 2) {
    violations.push({
      id: "em_dash_overuse",
      category: "punctuation",
      severity: emCount > 3 ? "error" : "warn",
      message: `${emCount} em dashes (—) · prefer ≤1 per paragraph · max 1–2 per post`,
    });
  }

  // Per-paragraph em dash: more than one in any paragraph is a strong AI tell
  for (const para of text.split(/\n\s*\n/)) {
    const paraEm = countEmDashes(para);
    if (paraEm > 1) {
      violations.push({
        id: "em_dash_per_paragraph",
        category: "punctuation",
        severity: "warn",
        message: `${paraEm} em dashes in one paragraph (max 1)`,
      });
      break;
    }
  }

  const lengths = sentenceLengths(text);
  let consecutiveSimilar = 1;
  let maxConsecutive = 1;
  for (let i = 1; i < lengths.length; i++) {
    const diff = Math.abs(lengths[i] - lengths[i - 1]);
    if (diff <= 3) {
      consecutiveSimilar++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveSimilar);
    } else {
      consecutiveSimilar = 1;
    }
  }
  if (maxConsecutive >= 4) {
    violations.push({
      id: "uniform_sentence_rhythm",
      category: "punctuation",
      severity: "warn",
      message: `${maxConsecutive} consecutive sentences with similar length`,
    });
  }

  return violations;
}

function detectEmojiIssues(text: string): HumanWritingViolation[] {
  const violations: HumanWritingViolation[] = [];
  const total = countEmoji(text);

  if (total > 3) {
    violations.push({
      id: "emoji_count",
      category: "emojis",
      severity: "error",
      message: `${total} emojis · max 3 per post`,
    });
  }

  const leading = linesWithLeadingEmoji(text);
  const lineCount = text.split("\n").filter((l) => l.trim()).length;
  if (lineCount >= 3 && leading >= Math.ceil(lineCount * 0.5)) {
    violations.push({
      id: "emoji_line_start",
      category: "emojis",
      severity: "error",
      message: "Emojis at the start of too many lines",
    });
  }

  if (emojiLineRatio(text) > 0.5 && countEmoji(text) > 0) {
    violations.push({
      id: "emoji_line_density",
      category: "emojis",
      severity: "warn",
      message: "Emojis on more than 50% of lines",
    });
  }

  if (emojiSentenceRatio(text) > 0.5 && countEmoji(text) > 1) {
    violations.push({
      id: "emoji_sentence_density",
      category: "emojis",
      severity: "warn",
      message: "More than 1 emoji per 2 sentences on average",
    });
  }

  return violations;
}

function detectParagraphPattern(text: string): HumanWritingViolation[] {
  const violations: HumanWritingViolation[] = [];
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length < 2) return violations;

  const sentenceCounts = paragraphs.map(countSentences);
  const allTwo = sentenceCounts.every((n) => n === 2);
  const uniqueSizes = new Set(sentenceCounts);

  if (allTwo && paragraphs.length >= 2) {
    violations.push({
      id: "two_sentence_blocks",
      category: "paragraphs",
      severity: "error",
      message: "Every paragraph has exactly 2 sentences (AI block pattern)",
    });
  }

  if (uniqueSizes.size === 1 && paragraphs.length >= 3) {
    violations.push({
      id: "uniform_paragraph_size",
      category: "paragraphs",
      severity: "warn",
      message: `All ${paragraphs.length} paragraphs have the same sentence count (${sentenceCounts[0]})`,
    });
  }

  return violations;
}

function detectVoiceIssues(
  text: string,
  contentLanguage: ContentLanguage,
): HumanWritingViolation[] {
  const violations: HumanWritingViolation[] = [];
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (wordCount < 40) return violations;

  if (!FIRST_PERSON_RE.test(text)) {
    violations.push({
      id: "missing_first_person",
      category: "voice",
      severity: "warn",
      message: 'No first-person voice (je/nous, I/we) detected',
    });
  }

  const opinionRe = OPINION_MARKERS[contentLanguage] ?? OPINION_MARKERS.en;
  if (!opinionRe.test(text)) {
    violations.push({
      id: "missing_opinion_marker",
      category: "voice",
      severity: "warn",
      message: "No explicit opinion or position marker detected",
    });
  }

  return violations;
}

export interface LintHumanWritingOptions {
  contentLanguage?: ContentLanguage;
}

/** Analyze text and return all human-writing violations with severity. */
export function lintHumanWriting(
  text: string,
  options: LintHumanWritingOptions = {},
): HumanWritingViolation[] {
  const combined = text.trim();
  if (!combined) return [];

  const lang = options.contentLanguage ?? "fr";

  return [
    ...detectBannedPhrases(combined, lang),
    ...detectStructuralPatterns(combined),
    ...detectPunctuationIssues(combined),
    ...detectEmojiIssues(combined),
    ...detectParagraphPattern(combined),
    ...detectVoiceIssues(combined, lang),
  ];
}
