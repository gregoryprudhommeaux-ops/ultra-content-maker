import { getAdminAuth } from "@/lib/firebase/admin-auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { ensurePlatformAdminClaim } from "@/lib/admin/ensure-platform-admin-claim.server";
import { recordLoginEvent } from "@/lib/admin/record-login-event.server";
import {
  isLoginNotifyConfigured,
  sendLoginNotificationEmail,
  type LoginNotifyPayload,
} from "@/lib/email/send-login-notification";
import {
  isSignupNotifyConfigured,
  sendSignupNotificationEmail,
} from "@/lib/email/send-signup-notification";
import { formatDisplayNameFromEmail } from "@/lib/workspace/display-name";
import { isPlatformAdminIdentity } from "@/lib/workspace/platform-admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  method?: "email" | "google";
  event?: "login" | "signup";
  locale?: string;
};

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    /* optional body */
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const user = await adminAuth.getUser(decoded.uid);

    const payload: LoginNotifyPayload = {
      userId: decoded.uid,
      userEmail: user.email ?? decoded.email ?? "unknown",
      displayName: user.displayName ?? undefined,
      method: body.method === "google" ? "google" : "email",
      event: body.event === "signup" ? "signup" : "login",
      locale: body.locale,
    };

    const db = getAdminFirestore();
    if (db) {
      await recordLoginEvent(db, {
        userId: payload.userId,
        email: payload.userEmail,
        displayName: payload.displayName,
        method: payload.method,
        event: payload.event,
        locale: payload.locale,
      }).catch(() => {});

      if (
        isPlatformAdminIdentity({
          uid: decoded.uid,
          email: user.email ?? decoded.email,
        })
      ) {
        const nextName =
          user.displayName?.trim() ||
          formatDisplayNameFromEmail(user.email ?? payload.userEmail) ||
          null;
        if (nextName) {
          await db.doc(`users/${decoded.uid}`).set(
            {
              displayName: nextName,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        }
      }
    }

    await ensurePlatformAdminClaim(adminAuth, decoded.uid, user.email ?? decoded.email).catch(
      () => {},
    );

    const userDocRef = db?.doc(`users/${decoded.uid}`);
    const alreadyNotifiedSignup = Boolean(
      userDocRef && (await userDocRef.get()).data()?.adminSignupNotifiedAt,
    );

    if (payload.event === "signup") {
      if (isSignupNotifyConfigured() && !alreadyNotifiedSignup) {
        await sendSignupNotificationEmail({
          userId: payload.userId,
          userEmail: payload.userEmail,
          displayName: payload.displayName,
          method: payload.method,
          locale: payload.locale,
        });
        if (userDocRef) {
          await userDocRef.set(
            { adminSignupNotifiedAt: FieldValue.serverTimestamp() },
            { merge: true },
          );
        }
      }
    } else if (isLoginNotifyConfigured()) {
      await sendLoginNotificationEmail(payload);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json(
      { error: "notify_failed", detail },
      { status: 502 },
    );
  }
}
