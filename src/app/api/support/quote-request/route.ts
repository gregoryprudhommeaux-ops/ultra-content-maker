import { getAdminAuth } from "@/lib/firebase/admin-auth";
import { getAdminFirestore, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import {
  isSupportQuoteEmailConfigured,
  sendSupportQuoteEmail,
  type SupportQuotePlan,
} from "@/lib/email/send-support-quote";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SHORT = 200;
const MAX_ACTIVITY = 4000;

type Body = {
  fullName?: string;
  companyName?: string;
  position?: string;
  activityNeed?: string;
  email?: string;
  whatsapp?: string;
  plan?: string;
  locale?: string;
  pageUrl?: string;
};

function normalizePlan(raw?: string): SupportQuotePlan {
  if (raw === "starter" || raw === "regular") return raw;
  return "unspecified";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const fullName = body.fullName?.trim().slice(0, MAX_SHORT) ?? "";
  const companyName = body.companyName?.trim().slice(0, MAX_SHORT) ?? "";
  const position = body.position?.trim().slice(0, MAX_SHORT) ?? "";
  const activityNeed = body.activityNeed?.trim().slice(0, MAX_ACTIVITY) ?? "";
  const email = body.email?.trim().slice(0, MAX_SHORT) ?? "";
  const whatsapp = body.whatsapp?.trim().slice(0, MAX_SHORT) ?? "";
  const plan = normalizePlan(body.plan);

  if (!fullName || !companyName || !email || !isValidEmail(email)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  let userId: string | undefined;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (token) {
    const adminAuth = getAdminAuth();
    if (adminAuth) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        userId = decoded.uid;
      } catch {
        /* public form · ignore invalid token */
      }
    }
  }

  const payload = {
    fullName,
    companyName,
    position,
    activityNeed,
    email,
    whatsapp,
    plan,
    locale: body.locale?.trim().slice(0, 12),
    pageUrl: body.pageUrl?.trim().slice(0, 500),
    userId,
  };

  const db = getAdminFirestore();
  const emailReady = isSupportQuoteEmailConfigured();
  const storeReady = isFirebaseAdminConfigured() && db;

  if (!emailReady && !storeReady) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  try {
    if (storeReady && db) {
      await db.collection("supportQuoteRequests").add({
        ...payload,
        createdAt: FieldValue.serverTimestamp(),
        status: "new",
      });
    }

    if (emailReady) {
      await sendSupportQuoteEmail(payload);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "submit_failed", detail }, { status: 502 });
  }
}
