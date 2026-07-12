/** Parse CSV rows: month,impressions,reactions,comments,notes (header optional). */
import type { LinkedInAnalyticsMonthlySummary } from "@/types/workspace";

export function parseLinkedInAnalyticsCsv(text: string): LinkedInAnalyticsMonthlySummary[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const out: LinkedInAnalyticsMonthlySummary[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lower = line.toLowerCase();
    if (i === 0 && (lower.includes("month") || lower.includes("mois") || lower.includes("mes"))) {
      continue;
    }

    const parts = line.split(/[,;\t]/).map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts.length < 1) continue;

    const month = parts[0]!;
    if (!/^\d{4}-\d{2}$/.test(month)) continue;

    const parseNum = (s: string | undefined) => {
      if (!s?.trim()) return undefined;
      const n = parseInt(s.replace(/\s/g, ""), 10);
      return Number.isFinite(n) && n >= 0 ? n : undefined;
    };

    out.push({
      month,
      totalImpressions: parseNum(parts[1]),
      totalReactions: parseNum(parts[2]),
      totalComments: parseNum(parts[3]),
      notes: parts[4]?.trim() ?? "",
    });
  }

  return out;
}
