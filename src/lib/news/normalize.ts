import { stableNewsId } from "@/lib/news/stable-id";
import type { NewsSuggestion } from "@/types/workspace";

/** Inclusive calendar-day window: today through 7 days ago (8 dates). */
export const NEWS_MAX_DAYS_AGO = 7;

export function isNewsWithinSevenDays(publishedAt: string, now = new Date()): boolean {
  const dateOnly = publishedAt.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const t = Date.parse(publishedAt);
    if (Number.isNaN(t)) return false;
    const ageMs = now.getTime() - t;
    return ageMs >= 0 && ageMs <= NEWS_MAX_DAYS_AGO * 24 * 60 * 60 * 1000;
  }

  const pubUtc = Date.parse(`${dateOnly}T12:00:00.000Z`);
  if (Number.isNaN(pubUtc)) return false;

  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    12,
  );
  const dayMs = 24 * 60 * 60 * 1000;
  const daysAgo = Math.floor((todayUtc - pubUtc) / dayMs);
  return daysAgo >= 0 && daysAgo <= NEWS_MAX_DAYS_AGO;
}

export type NewsNormalizeResult = {
  news: NewsSuggestion[];
  rawCount: number;
  rejectedByAge: number;
  rejectedIncomplete: number;
};

export function normalizeNewsSuggestions(raw: unknown): NewsNormalizeResult {
  const empty: NewsNormalizeResult = {
    news: [],
    rawCount: 0,
    rejectedByAge: 0,
    rejectedIncomplete: 0,
  };

  if (!raw || typeof raw !== "object") return empty;
  const list = (raw as { news?: unknown }).news ?? raw;
  if (!Array.isArray(list)) return empty;

  const out: NewsSuggestion[] = [];
  let rejectedByAge = 0;
  let rejectedIncomplete = 0;

  for (let i = 0; i < list.length; i++) {
    const item = list[i] as Record<string, unknown>;
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const summary = typeof item.summary === "string" ? item.summary.trim() : "";
    const url = typeof item.url === "string" ? item.url.trim() : "";
    const publishedAt =
      typeof item.publishedAt === "string" ? item.publishedAt.trim() : "";

    if (!title || !summary || !url || !publishedAt) {
      rejectedIncomplete++;
      continue;
    }
    if (!/^https?:\/\//i.test(url)) {
      rejectedIncomplete++;
      continue;
    }
    if (!isNewsWithinSevenDays(publishedAt)) {
      rejectedByAge++;
      continue;
    }

    out.push({
      id: stableNewsId(url),
      title,
      summary,
      url,
      sourceName:
        typeof item.sourceName === "string" ? item.sourceName.trim() : undefined,
      publishedAt,
    });
    if (out.length >= 4) break;
  }

  return {
    news: out,
    rawCount: list.length,
    rejectedByAge,
    rejectedIncomplete,
  };
}
