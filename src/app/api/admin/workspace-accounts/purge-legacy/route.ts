import { purgeLegacyAdminClientAccounts } from "@/lib/admin/delete-client.server";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin.server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const admin = await requirePlatformAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  try {
    const deleted = await purgeLegacyAdminClientAccounts(db, admin.uid);
    return NextResponse.json({ ok: true, deletedAccountIds: deleted });
  } catch (e) {
    const code = e instanceof Error ? e.message : "purge_failed";
    return NextResponse.json({ error: code }, { status: 500 });
  }
}
