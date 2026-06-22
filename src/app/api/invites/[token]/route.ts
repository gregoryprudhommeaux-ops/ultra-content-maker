import { getAccountInvitePreview } from "@/lib/admin/account-invites.server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  const preview = await getAccountInvitePreview(db, token);
  if (!preview) {
    return NextResponse.json({ error: "invite_not_found" }, { status: 404 });
  }

  return NextResponse.json(preview);
}
