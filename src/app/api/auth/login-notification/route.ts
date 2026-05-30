import { getAdminAuth } from "@/lib/firebase/admin-auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { recordLoginEvent } from "@/lib/admin/record-login-event.server";
import {
  isLoginNotifyConfigured,
  sendLoginNotificationEmail,
  type LoginNotifyPayload,
} from "@/lib/email/send-login-notification";
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
    }

    if (isLoginNotifyConfigured()) {
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
