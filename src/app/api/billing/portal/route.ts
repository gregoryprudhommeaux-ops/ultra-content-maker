import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin-auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { createBillingPortalSession, isStripeConfigured } from "@/lib/subscription/stripe";
import { getSubscriptionProfileServer } from "@/lib/subscription/subscription.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const adminAuth = getAdminAuth();
  if (!adminAuth || !getAdminFirestore()) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  let locale: string | undefined;
  try {
    const body = (await request.json()) as { locale?: string };
    locale = body.locale;
  } catch {
    locale = undefined;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const profile = await getSubscriptionProfileServer(decoded.uid);
    const customerId = profile.stripeCustomerId?.trim();
    if (!customerId) {
      return NextResponse.json({ error: "no_stripe_customer" }, { status: 400 });
    }

    const session = await createBillingPortalSession({ customerId, locale });
    if (!session) {
      return NextResponse.json({ error: "portal_failed" }, { status: 502 });
    }
    return NextResponse.json(session);
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "portal_failed", detail }, { status: 502 });
  }
}
