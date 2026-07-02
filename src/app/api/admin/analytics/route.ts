import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  buildAdminAnalytics,
  loadConnectionBucketsForPeriods,
} from "@/lib/admin/analytics.server";
import {
  getCachedConnectionPeriod,
  invalidateAdminAnalyticsCache,
  setCachedConnectionPeriod,
} from "@/lib/admin/analytics-cache.server";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin.server";
import type { ConnectionGranularity } from "@/lib/admin/analytics-types";
import { CONNECTION_PERIOD_KEYS } from "@/lib/admin/analytics-types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseConnectionPeriod(value: string | null): ConnectionGranularity | null {
  if (!value) return null;
  return CONNECTION_PERIOD_KEYS.includes(value as ConnectionGranularity)
    ? (value as ConnectionGranularity)
    : null;
}

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") ?? "overview";
  const refresh = url.searchParams.get("refresh") === "1";
  const connectionPeriod = parseConnectionPeriod(url.searchParams.get("connectionPeriod"));

  if (refresh) {
    invalidateAdminAnalyticsCache();
  }

  try {
    if (scope === "connections") {
      const period = connectionPeriod ?? "day";
      const cached = !refresh ? getCachedConnectionPeriod(period) : null;
      const buckets =
        cached ??
        (await loadConnectionBucketsForPeriods(db, [period]))[period] ??
        [];
      if (!cached) {
        setCachedConnectionPeriod(period, buckets);
      }
      return NextResponse.json({
        scope: "connections",
        generatedAt: new Date().toISOString(),
        connections: { [period]: buckets },
      });
    }

    if (scope === "full") {
      const data = await buildAdminAnalytics(db, {
        connectionPeriods: CONNECTION_PERIOD_KEYS,
        useCache: false,
      });
      return NextResponse.json(data);
    }

    const periods =
      connectionPeriod != null ? [connectionPeriod] : (["day"] as ConnectionGranularity[]);

    const data = await buildAdminAnalytics(db, {
      connectionPeriods: periods,
      useCache: !refresh,
    });

    return NextResponse.json(data);
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "analytics_failed", detail }, { status: 500 });
  }
}
