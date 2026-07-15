import type { ContentLanguage } from "@/types/workspace";
import { buildAntiAiHumanizerSystemPrompt } from "@/lib/prompts/anti-ai-humanizer";
import type { HumanWritingViolation } from "./human-writing-lint";

/**
 * System prompt for an auto-fix / humanize revision pass.
 * Uses full ANTI-IA-SLOP HUMANIZER (aligned with Cursor skill /anti-linkedin-slop).
 */
export function buildHumanWritingRewriteSystemPrompt(
  contentLanguage: ContentLanguage,
): string {
  return buildAntiAiHumanizerSystemPrompt(contentLanguage, { jsonFields: true });
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
      violationsToFix: violationList || "General anti-IA-slop humanize polish",
      instruction:
        "Humanize the post: fix every listed violation, apply ANTI-IA-SLOP HUMANIZER rules, keep the same language, preserve facts and niche. Output JSON only.",
    },
    null,
    2,
  );
}
