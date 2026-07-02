import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin-auth";
import { createBillingPortalSession, createCheckoutSession, isStripeConfigured } from "@/lib/subscription/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  tier?: "pro" | "pro_plus";
  locale?: string;
};

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
    if (body.tier !== "pro" && body.tier !== "pro_plus") throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const user = await adminAuth.getUser(decoded.uid);
    const email = user.email ?? decoded.email;
    if (!email) {
      return NextResponse.json({ error: "email_required" }, { status: 400 });
    }

    const session = await createCheckoutSession({
      userId: decoded.uid,
      email,
      tier: body.tier,
      locale: body.locale,
    });
    if (!session) {
      return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
    }
    return NextResponse.json(session);
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "checkout_failed", detail }, { status: 502 });
  }
}

export async function GET(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ configured: false });
  }
  return NextResponse.json({ configured: true });
}
