import { getAdminAuth } from "@/lib/firebase/admin-auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { isPlatformAdminEmail } from "@/lib/workspace/platform-admin";
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

    if (isPlatformAdminEmail(email)) {
      return { uid: decoded.uid, email };
    }

    const db = getAdminFirestore();
    if (db) {
      const userSnap = await db.doc(`users/${decoded.uid}`).get();
      if (userSnap.exists && userSnap.data()?.isPlatformAdmin === true) {
        return { uid: decoded.uid, email: email || "admin@local" };
      }
    }

    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
}
