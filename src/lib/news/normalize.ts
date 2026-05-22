import type { NewsSuggestion } from "@/types/workspace";

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function isNewsWithinSevenDays(publishedAt: string): boolean {
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= MAX_AGE_MS && t <= Date.now() + 24 * 60 * 60 * 1000;
}

export function normalizeNewsSuggestions(raw: unknown): NewsSuggestion[] {
  if (!raw || typeof raw !== "object") return [];
  const list = (raw as { news?: unknown }).news ?? raw;
  if (!Array.isArray(list)) return [];

  const out: NewsSuggestion[] = [];
  for (let i = 0; i < list.length && out.length < 4; i++) {
    const item = list[i] as Record<string, unknown>;
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const summary = typeof item.summary === "string" ? item.summary.trim() : "";
    const url = typeof item.url === "string" ? item.url.trim() : "";
    const publishedAt =
      typeof item.publishedAt === "string" ? item.publishedAt.trim() : "";
    if (!title || !summary || !url || !publishedAt) continue;
    if (!/^https?:\/\//i.test(url)) continue;
    if (!isNewsWithinSevenDays(publishedAt)) continue;

    out.push({
      id: `news-${i}-${Date.parse(publishedAt)}`,
      title,
      summary,
      url,
      sourceName:
        typeof item.sourceName === "string" ? item.sourceName.trim() : undefined,
      publishedAt,
    });
  }
  return out;
}
