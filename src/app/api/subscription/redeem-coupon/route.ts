import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { redeemCouponServer } from "@/lib/subscription/coupons.server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  code?: string;
  suggestedPlan?: "pro" | "pro_plus";
};

export async function POST(request: Request) {
  const uid = await verifyBearerUserId(request.headers.get("authorization"));
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json({ error: "missing_code" }, { status: 400 });
  }

  const result = await redeemCouponServer(uid, code, body.suggestedPlan);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ tier: result.tier, profile: result.profile });
}
