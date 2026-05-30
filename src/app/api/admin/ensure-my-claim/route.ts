import { getAdminAuth } from "@/lib/firebase/admin-auth";
import { ensurePlatformAdminClaim } from "@/lib/admin/ensure-platform-admin-claim.server";
import { isPlatformAdminIdentity } from "@/lib/workspace/platform-admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Allowlisted users can set their own platformAdmin custom claim (no local gcloud/JSON key).
 * Call while logged in: POST with Authorization: Bearer <Firebase ID token>
 */
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const authUser = await adminAuth.getUser(decoded.uid);
    const email = authUser.email ?? decoded.email ?? null;

    if (
      !isPlatformAdminIdentity({
        uid: decoded.uid,
        email,
        claims: decoded as Record<string, unknown>,
      })
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const applied = await ensurePlatformAdminClaim(adminAuth, decoded.uid, email);

    return NextResponse.json({
      ok: true,
      applied,
      uid: decoded.uid,
      email,
      message: "Sign out and sign in again to refresh your token.",
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "claim_failed", detail }, { status: 500 });
  }
}
