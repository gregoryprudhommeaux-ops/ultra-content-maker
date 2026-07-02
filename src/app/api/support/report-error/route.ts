import { getAdminAuth } from "@/lib/firebase/admin-auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { persistErrorReport } from "@/lib/admin/error-reports.server";
import {
  isErrorReportConfigured,
  sendErrorReportEmail,
  type ErrorReportPayload,
} from "@/lib/email/send-error-report";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_NOTE = 2000;
const MAX_DETAIL = 8000;
const MAX_MESSAGE = 500;
const MAX_SURFACE = 120;

type Body = {
  surface?: string;
  userMessage?: string;
  errorCode?: string;
  detail?: string;
  userNote?: string;
  locale?: string;
  pageUrl?: string;
};

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminAuth = getAdminAuth();
  const db = getAdminFirestore();
  if (!adminAuth) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
    if (!body.surface?.trim() || !body.userMessage?.trim()) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const user = await adminAuth.getUser(decoded.uid);
    const userAgent = request.headers.get("user-agent") ?? undefined;

    const payload: ErrorReportPayload = {
      userId: decoded.uid,
      userEmail: user.email ?? decoded.email ?? "unknown",
      displayName: user.displayName ?? undefined,
      surface: body.surface!.trim().slice(0, MAX_SURFACE),
      userMessage: body.userMessage!.trim().slice(0, MAX_MESSAGE),
      errorCode: body.errorCode?.trim().slice(0, 120),
      detail: body.detail?.trim().slice(0, MAX_DETAIL),
      userNote: body.userNote?.trim().slice(0, MAX_NOTE),
      locale: body.locale?.trim().slice(0, 12),
      pageUrl: body.pageUrl?.trim().slice(0, 500),
      userAgent,
    };

    let persisted = false;
    if (db) {
      await persistErrorReport(db, payload);
      persisted = true;
    }

    if (isErrorReportConfigured()) {
      await sendErrorReportEmail(payload);
    } else if (!persisted) {
      return NextResponse.json({ error: "email_not_configured" }, { status: 503 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "report_failed", detail }, { status: 502 });
  }
}
