import { deletePlatformUser } from "@/lib/admin/delete-client.server";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin.server";
import { getAdminAuth } from "@/lib/firebase/admin-auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

type Body = { userId: string };

export async function POST(request: Request) {
  const admin = await requirePlatformAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const db = getAdminFirestore();
  const auth = getAdminAuth();
  if (!db || !auth) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
    if (!body.userId?.trim()) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    await deletePlatformUser(db, auth, body.userId.trim(), admin.uid);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const code = e instanceof Error ? e.message : "delete_failed";
    const status =
      code === "cannot_delete_self" ||
      code === "cannot_delete_admin" ||
      code === "user_not_found"
        ? 400
        : 500;
    return NextResponse.json({ error: code }, { status });
  }
}
