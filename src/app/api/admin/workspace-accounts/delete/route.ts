import {
  deleteClientWorkspaceAccount,
} from "@/lib/admin/delete-client.server";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin.server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

type Body = { accountId: string };

export async function POST(request: Request) {
  const admin = await requirePlatformAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
    if (!body.accountId?.trim()) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    await deleteClientWorkspaceAccount(db, admin.uid, body.accountId.trim());
    return NextResponse.json({ ok: true });
  } catch (e) {
    const code = e instanceof Error ? e.message : "delete_failed";
    const status =
      code === "cannot_delete_default_account" || code === "account_not_found"
        ? 400
        : 500;
    return NextResponse.json({ error: code }, { status });
  }
}
