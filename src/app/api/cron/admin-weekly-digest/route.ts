import { runWeeklyAdminDigest } from "@/lib/admin/admin-weekly-digest.server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  try {
    const result = await runWeeklyAdminDigest(db);
    return NextResponse.json({
      ok: true,
      emailed: result.emailed,
      mrrUsd: result.payload.mrrUsd,
      mrrDeltaUsd: result.payload.mrrDeltaUsd,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "digest_failed", detail }, { status: 500 });
  }
}
