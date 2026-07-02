import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import type { LlmProvider } from "@/types/workspace";

export type LlmUsageRecord = {
  userId: string;
  route: string;
  provider: LlmProvider;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  usedPlatformKey: boolean;
  createdAt: string | null;
};

/** Rough blended $/1K tokens for admin COGS (platform key only). */
const PLATFORM_COST_PER_1K_TOKENS_USD = 0.002;

function itemsCollection(db: Firestore) {
  return db.collection("platform").doc("llmUsage").collection("items");
}

export function estimateLlmCostUsd(totalTokens: number): number {
  return (totalTokens / 1000) * PLATFORM_COST_PER_1K_TOKENS_USD;
}

export async function recordLlmUsage(
  db: Firestore,
  entry: Omit<LlmUsageRecord, "createdAt" | "estimatedCostUsd"> & {
    estimatedCostUsd?: number;
  },
): Promise<void> {
  const totalTokens = entry.promptTokens + entry.completionTokens;
  const estimatedCostUsd =
    entry.estimatedCostUsd ??
    (entry.usedPlatformKey ? estimateLlmCostUsd(totalTokens) : 0);

  await itemsCollection(db).add({
    userId: entry.userId,
    route: entry.route,
    provider: entry.provider,
    model: entry.model,
    promptTokens: entry.promptTokens,
    completionTokens: entry.completionTokens,
    totalTokens,
    estimatedCostUsd,
    usedPlatformKey: entry.usedPlatformKey,
    createdAt: FieldValue.serverTimestamp(),
  });
}

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return null;
}

export type LlmUsageSummary = {
  platformCalls: number;
  platformTokens: number;
  platformCostUsd: number;
  byRoute: Record<string, { calls: number; costUsd: number }>;
  byUserId: Record<string, number>;
};

export async function summarizeLlmUsage(
  db: Firestore,
  since: Date,
): Promise<LlmUsageSummary> {
  const snap = await itemsCollection(db)
    .where("createdAt", ">=", since)
    .get()
    .catch(async () => {
      const fallback = await itemsCollection(db).orderBy("createdAt", "desc").limit(500).get();
      return fallback;
    });

  let platformCalls = 0;
  let platformTokens = 0;
  let platformCostUsd = 0;
  const byRoute: Record<string, { calls: number; costUsd: number }> = {};
  const byUserId: Record<string, number> = {};

  for (const doc of snap.docs) {
    const data = doc.data();
    const createdAt = toIsoDate(data.createdAt);
    if (createdAt && new Date(createdAt) < since) continue;
    if (!data.usedPlatformKey) continue;

    const tokens = typeof data.totalTokens === "number" ? data.totalTokens : 0;
    const cost =
      typeof data.estimatedCostUsd === "number"
        ? data.estimatedCostUsd
        : estimateLlmCostUsd(tokens);
    const route = String(data.route ?? "unknown");

    platformCalls += 1;
    platformTokens += tokens;
    platformCostUsd += cost;
    const userId = String(data.userId ?? "");
    if (userId) {
      byUserId[userId] = (byUserId[userId] ?? 0) + cost;
    }
    if (!byRoute[route]) byRoute[route] = { calls: 0, costUsd: 0 };
    byRoute[route].calls += 1;
    byRoute[route].costUsd += cost;
  }

  return { platformCalls, platformTokens, platformCostUsd, byRoute, byUserId };
}
