import type { AdminAnalyticsPayload, ConnectionGranularity } from "@/lib/admin/analytics-types";

const CACHE_TTL_MS = 60_000;

type AnalyticsCacheEntry = {
  expiresAt: number;
  core: Omit<AdminAnalyticsPayload, "connections">;
  connections: Partial<Record<ConnectionGranularity, AdminAnalyticsPayload["connections"][ConnectionGranularity]>>;
};

let cache: AnalyticsCacheEntry | null = null;

export function getCachedAnalyticsCore(): Omit<AdminAnalyticsPayload, "connections"> | null {
  if (!cache || Date.now() >= cache.expiresAt) return null;
  return cache.core;
}

export function getCachedConnectionPeriod(
  period: ConnectionGranularity,
): AdminAnalyticsPayload["connections"][ConnectionGranularity] | null {
  if (!cache || Date.now() >= cache.expiresAt) return null;
  return cache.connections[period] ?? null;
}

export function setCachedAnalyticsCore(core: Omit<AdminAnalyticsPayload, "connections">): void {
  cache = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    core,
    connections: cache?.connections ?? {},
  };
}

export function setCachedConnectionPeriod(
  period: ConnectionGranularity,
  buckets: AdminAnalyticsPayload["connections"][ConnectionGranularity],
): void {
  if (!cache) {
    cache = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      core: null as unknown as Omit<AdminAnalyticsPayload, "connections">,
      connections: { [period]: buckets },
    };
    return;
  }
  cache.connections[period] = buckets;
  cache.expiresAt = Date.now() + CACHE_TTL_MS;
}

export function invalidateAdminAnalyticsCache(): void {
  cache = null;
}
