import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  getSubscriptionAccessServer,
  getSubscriptionProfileServer,
} from "@/lib/subscription/subscription.server";
import { resolveSubscriptionAccess } from "@/lib/subscription/access";
import { hasPlatformAdminClaim, isPlatformAdminIdentity } from "@/lib/workspace/platform-admin";
import { getAdminAuth } from "@/lib/firebase/admin-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readUserFlags(uid: string) {
  const db = getAdminFirestore();
  if (!db) return { isPlatformAdmin: false, hasLinkedWorkspace: false };
  const snap = await db.doc(`users/${uid}`).get();
  const data = snap.data();
  return {
    isPlatformAdmin: data?.isPlatformAdmin === true,
    hasLinkedWorkspace: Boolean(data?.linkedWorkspace?.ownerId),
  };
}

export async function GET(request: Request) {
  const uid = await verifyBearerUserId(request.headers.get("authorization"));
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  let isPlatformAdmin = false;
  const adminAuth = getAdminAuth();
  if (adminAuth && token) {
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      isPlatformAdmin =
        hasPlatformAdminClaim(decoded as Record<string, unknown>) ||
        isPlatformAdminIdentity({
          uid: decoded.uid,
          email: decoded.email,
          claims: decoded as Record<string, unknown>,
        });
    } catch {
      /* ignore */
    }
  }

  const flags = await readUserFlags(uid);
  const profile = await getSubscriptionProfileServer(uid);
  const access = resolveSubscriptionAccess(profile, {
    isPlatformAdmin: isPlatformAdmin || flags.isPlatformAdmin,
    hasLinkedWorkspace: flags.hasLinkedWorkspace,
  });

  return NextResponse.json({ profile, access });
}
