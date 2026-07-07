import type { ContentLanguage } from "@/types/workspace";
import { buildHumanWritingRules } from "./human-writing-rules";
import type { HumanWritingViolation } from "./human-writing-lint";

/**
 * System prompt for an auto-fix revision pass targeting human-writing violations.
 */
export function buildHumanWritingRewriteSystemPrompt(
  contentLanguage: ContentLanguage,
): string {
  return `You rewrite a LinkedIn post to fix human-writing / anti-AI-detection issues while preserving meaning, facts, and author voice.

${buildHumanWritingRules(contentLanguage)}

Reply with a single valid JSON object only: { "hook": string, "body": string, "ps": string }.
Do not invent facts, clients, or metrics not in the original post.`;
}

export function buildHumanWritingRewriteUserPrompt(input: {
  hook: string;
  body: string;
  ps?: string;
  violations: HumanWritingViolation[];
}): string {
  const violationList = input.violations
    .map((v) => `- [${v.severity}] ${v.id}: ${v.message}`)
    .join("\n");

  return JSON.stringify(
    {
      current: {
        hook: input.hook,
        body: input.body,
        ps: input.ps ?? "",
      },
      violationsToFix: violationList || "General human-writing polish",
      instruction:
        "Fix every listed violation. Keep the same language. Preserve scope and niche. Output JSON only.",
    },
    null,
    2,
  );
}
