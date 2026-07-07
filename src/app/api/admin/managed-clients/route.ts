import {
  linkManagedClientByEmail,
  linkManagedClientByUserId,
  listManagedWorkspaceAccountsForAdmin,
  unlinkManagedClient,
} from "@/lib/admin/managed-clients.server";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin.server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

type LinkBody = { email?: string; userId?: string; accountId?: string };
type UnlinkBody = { clientUid: string };

export async function GET(request: Request) {
  const admin = await requirePlatformAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  try {
    const accounts = await listManagedWorkspaceAccountsForAdmin(db, admin.uid);
    return NextResponse.json({ accounts });
  } catch (e) {
    const code = e instanceof Error ? e.message : "list_failed";
    return NextResponse.json({ error: code }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requirePlatformAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const db = getAdminFirestore();
  const auth = getAdminAuth();
  if (!db || !auth) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  let body: LinkBody;
  try {
    body = (await request.json()) as LinkBody;
    if (!body.email?.trim() && !body.userId?.trim()) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const entry = body.userId?.trim()
      ? await linkManagedClientByUserId(db, admin.uid, body.userId.trim(), body.accountId?.trim())
      : await linkManagedClientByEmail(
          db,
          auth,
          admin.uid,
          body.email!.trim(),
          body.accountId?.trim(),
        );
    return NextResponse.json({ ok: true, client: entry });
  } catch (e) {
    const code = e instanceof Error ? e.message : "link_failed";
    const status =
      code === "user_not_found" ||
      code === "client_doc_missing" ||
      code === "client_account_missing" ||
      code === "invalid_email" ||
      code === "cannot_link_self" ||
      code === "cannot_link_admin" ||
      code === "client_already_managed"
        ? 400
        : 500;
    return NextResponse.json({ error: code }, { status });
  }
}

export async function DELETE(request: Request) {
  const admin = await requirePlatformAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  let body: UnlinkBody;
  try {
    body = (await request.json()) as UnlinkBody;
    if (!body.clientUid?.trim()) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    await unlinkManagedClient(db, admin.uid, body.clientUid.trim());
    return NextResponse.json({ ok: true });
  } catch (e) {
    const code = e instanceof Error ? e.message : "unlink_failed";
    const status = code === "client_not_linked" || code === "admin_not_found" ? 400 : 500;
    return NextResponse.json({ error: code }, { status });
  }
}
