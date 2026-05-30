import { getAdminFirestore } from "@/lib/firebase/admin";
import { buildAdminAnalytics } from "@/lib/admin/analytics.server";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin.server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  try {
    const data = await buildAdminAnalytics(db);
    return NextResponse.json(data);
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "analytics_failed", detail }, { status: 500 });
  }
}
