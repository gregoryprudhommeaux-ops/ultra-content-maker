import { claimAccountInvite } from "@/lib/admin/account-invites.server";
import { getAdminAuth } from "@/lib/firebase/admin-auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

type Body = { token: string };

export async function POST(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const adminAuth = getAdminAuth();
  const db = getAdminFirestore();
  if (!adminAuth || !db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
    if (!body.token?.trim()) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(bearer);
    const linkedWorkspace = await claimAccountInvite(db, body.token.trim(), decoded.uid);
    return NextResponse.json({ linkedWorkspace });
  } catch (e) {
    const code = e instanceof Error ? e.message : "claim_failed";
    const status =
      code === "invite_not_found"
        ? 404
        : code === "invite_expired"
          ? 409
          : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
