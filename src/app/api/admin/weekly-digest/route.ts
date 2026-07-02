import {
  buildWeeklyDigestPayload,
  runWeeklyAdminDigest,
} from "@/lib/admin/admin-weekly-digest.server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin.server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Manual trigger for platform admin (test or catch-up). */
export async function POST(request: Request) {
  const admin = await requirePlatformAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  try {
    if (dryRun) {
      const payload = await buildWeeklyDigestPayload(db);
      return NextResponse.json({ ok: true, dryRun: true, payload });
    }
    const result = await runWeeklyAdminDigest(db);
    return NextResponse.json({
      ok: true,
      emailed: result.emailed,
      payload: result.payload,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "digest_failed", detail }, { status: 500 });
  }
}
