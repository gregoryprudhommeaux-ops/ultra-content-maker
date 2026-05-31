import { getAdminAuth } from "@/lib/firebase/admin-auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { ensurePlatformAdminClaim } from "@/lib/admin/ensure-platform-admin-claim.server";
import {
  hasPlatformAdminClaim,
  isPlatformAdminEmail,
  isPlatformAdminIdentity,
  isPlatformAdminUid,
} from "@/lib/workspace/platform-admin";
import { NextResponse } from "next/server";

export type PlatformAdminContext = {
  uid: string;
  email: string;
};

export async function requirePlatformAdmin(
  request: Request,
): Promise<PlatformAdminContext | NextResponse> {
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
    const email = (authUser.email ?? decoded.email ?? "").trim();

    if (hasPlatformAdminClaim(decoded as Record<string, unknown>)) {
      return { uid: decoded.uid, email: email || "admin@local" };
    }

    if (
      isPlatformAdminIdentity({
        uid: decoded.uid,
        email,
        claims: decoded as Record<string, unknown>,
      })
    ) {
      await ensurePlatformAdminClaim(adminAuth, decoded.uid, email).catch(() => {});
      return { uid: decoded.uid, email: email || "admin@local" };
    }

    const db = getAdminFirestore();
    if (db) {
      const userSnap = await db.doc(`users/${decoded.uid}`).get();
      if (userSnap.exists && userSnap.data()?.isPlatformAdmin === true) {
        if (isPlatformAdminUid(decoded.uid) || isPlatformAdminEmail(email)) {
          return { uid: decoded.uid, email: email || "admin@local" };
        }
      }
    }

    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
}
