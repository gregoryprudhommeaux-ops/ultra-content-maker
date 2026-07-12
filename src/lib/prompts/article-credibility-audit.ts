import type { ContentLanguage, OrganizationProfile } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function buildCredibilityAuditSystemPrompt(contentLanguage: ContentLanguage): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
  return `You are a B2B LinkedIn credibility editor for company/product posts.

Review the draft post against the organization profile rules. Be strict but practical.

Return JSON only in ${lang} for all string values:
{
  "overall": "pass" | "review" | "block",
  "summary": string,
  "issues": [
    {
      "severity": "high" | "medium" | "low",
      "category": "forbidden_phrase" | "stats" | "service_scope" | "team" | "tone" | "other",
      "excerpt": string,
      "fix": string
    }
  ],
  "suggestedEdits": string[]
}

Rules:
- high severity = must fix before publishing (invented stats, forbidden phrases, unknown team names, SAV overpromise)
- medium = should fix (vague claims, weak sourcing)
- low = optional polish
- suggestedEdits: 0-3 concrete rewrite snippets (not full post)`;
}

export function buildCredibilityAuditUserPrompt(input: {
  hook: string;
  body: string;
  ps?: string;
  orgBlock: string | null;
  heuristicFails?: string[];
}): string {
  return JSON.stringify(
    {
      hook: input.hook,
      body: input.body,
      ps: input.ps ?? "",
      organizationRules: input.orgBlock ?? "",
      heuristicFlags: input.heuristicFails ?? [],
      instruction: "Audit this LinkedIn post for credibility against organization rules.",
    },
    null,
    2,
  );
}

export type CredibilityAuditResult = {
  overall: "pass" | "review" | "block";
  summary: string;
  issues: Array<{
    severity: "high" | "medium" | "low";
    category: string;
    excerpt: string;
    fix: string;
  }>;
  suggestedEdits: string[];
};

export function normalizeCredibilityAudit(raw: unknown): CredibilityAuditResult | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const overall =
    o.overall === "pass" || o.overall === "review" || o.overall === "block"
      ? o.overall
      : "review";
  const summary = typeof o.summary === "string" ? o.summary.trim() : "";
  if (!summary) return null;

  const issuesRaw = o.issues;
  const issues: CredibilityAuditResult["issues"] = [];
  if (Array.isArray(issuesRaw)) {
    for (const item of issuesRaw) {
      if (!item || typeof item !== "object") continue;
      const i = item as Record<string, unknown>;
      const severity =
        i.severity === "high" || i.severity === "medium" || i.severity === "low"
          ? i.severity
          : "medium";
      const category = typeof i.category === "string" ? i.category.trim() : "other";
      const excerpt = typeof i.excerpt === "string" ? i.excerpt.trim() : "";
      const fix = typeof i.fix === "string" ? i.fix.trim() : "";
      if (!excerpt && !fix) continue;
      issues.push({ severity, category, excerpt, fix });
    }
  }

  const editsRaw = o.suggestedEdits;
  const suggestedEdits = Array.isArray(editsRaw)
    ? editsRaw
        .filter((e): e is string => typeof e === "string" && e.trim().length > 0)
        .map((e) => e.trim())
        .slice(0, 3)
    : [];

  return { overall, summary, issues, suggestedEdits };
}
