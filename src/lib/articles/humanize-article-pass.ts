import { chatCompletionJson, mergeUsageLog } from "@/lib/llm/chat";
import type { LlmConfig } from "@/lib/llm/config";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildHumanWritingRewriteSystemPrompt,
  buildHumanWritingRewriteUserPrompt,
  lintHumanWriting,
} from "@/lib/articles/human-writing";
import { detectSlop } from "@/lib/articles/slop-detector";
import type { ContentLanguage, SlopAnalysis } from "@/types/workspace";

export type ArticleParts = {
  hook: string;
  body: string;
  ps?: string;
};

/** Run humanizer when detector or checklist says the draft still looks AI-shaped. */
export function shouldHumanizeArticle(
  text: string,
  contentLanguage: ContentLanguage,
): { run: boolean; slop: SlopAnalysis } {
  const slop = detectSlop(text, { contentLanguage });
  const violations = lintHumanWriting(text, { contentLanguage });
  const hasError = violations.some((v) => v.severity === "error");
  const blockingFlags = [
    "survey_opener",
    "soft_survey_hear",
    "theatrical_dig",
    "qualification_triad",
    "result_antithesis",
    "real_lever_close",
    "en_loft_vocab",
    "school_opener",
    "fr_corp_calque",
    "soft_verb_stack",
    "wikipedia_moral_close",
    "next_level_bait",
  ];
  const hasBlockingFlag = slop.flags.some((f) =>
    blockingFlags.some((b) => f === b || f.includes(b)),
  );
  const run =
    slop.slopScore >= 4 ||
    slop.summary === "heavy_slop" ||
    hasError ||
    hasBlockingFlag ||
    (slop.humanWriting?.summary === "critical");
  return { run, slop };
}

/**
 * Post-generation gate: detect slop → optional full HUMANIZER pass (Mr. ANTI-AI-SLOP).
 * Language-aware FR/EN/ES. Soft-fails back to original if LLM fails.
 */
export async function humanizeArticlePass(
  llm: LlmConfig,
  parts: ArticleParts,
  contentLanguage: ContentLanguage,
  usage: { userId: string; route: string },
  options: { force?: boolean } = {},
): Promise<{
  parts: ArticleParts;
  humanized: boolean;
  slopBefore: SlopAnalysis;
  slopAfter: SlopAnalysis;
}> {
  const combined = `${parts.hook}\n\n${parts.body}${parts.ps ? `\n\n${parts.ps}` : ""}`;
  const { run, slop: slopBefore } = shouldHumanizeArticle(combined, contentLanguage);

  if (!options.force && !run) {
    return { parts, humanized: false, slopBefore, slopAfter: slopBefore };
  }

  const violations = lintHumanWriting(combined, { contentLanguage });

  try {
    const raw = await chatCompletionJson(
      llm,
      [
        {
          role: "system",
          content: buildHumanWritingRewriteSystemPrompt(contentLanguage),
        },
        {
          role: "user",
          content: buildHumanWritingRewriteUserPrompt({
            hook: parts.hook,
            body: parts.body,
            ps: parts.ps,
            violations,
          }),
        },
      ],
      mergeUsageLog(usage.userId, usage.route, {
        temperature: 0.35,
        maxTokens: 2048,
      }),
    );

    const parsed = parseLlmJson<{
      hook?: string;
      body?: string;
      ps?: string;
    }>(raw);

    const next: ArticleParts = {
      hook: parsed.hook?.trim() || parts.hook,
      body: parsed.body?.trim() || parts.body,
      ps: parsed.ps?.trim() ? parsed.ps.trim() : parts.ps,
    };
    const afterText = `${next.hook}\n\n${next.body}${next.ps ? `\n\n${next.ps}` : ""}`;
    const slopAfter = detectSlop(afterText, { contentLanguage });
    return { parts: next, humanized: true, slopBefore, slopAfter };
  } catch {
    return { parts, humanized: false, slopBefore, slopAfter: slopBefore };
  }
}

/** Sequential humanize for a batch (avoids provider rate spikes). */
export async function humanizeArticlesPass(
  llm: LlmConfig,
  articles: ArticleParts[],
  contentLanguage: ContentLanguage,
  usage: { userId: string; route: string },
): Promise<{
  articles: ArticleParts[];
  humanizedCount: number;
  slopAnalyses: SlopAnalysis[];
}> {
  const out: ArticleParts[] = [];
  const slopAnalyses: SlopAnalysis[] = [];
  let humanizedCount = 0;

  for (const article of articles) {
    const result = await humanizeArticlePass(llm, article, contentLanguage, usage);
    out.push(result.parts);
    slopAnalyses.push(result.slopAfter);
    if (result.humanized) humanizedCount += 1;
  }

  return { articles: out, humanizedCount, slopAnalyses };
}
