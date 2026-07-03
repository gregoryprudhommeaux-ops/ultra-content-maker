import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin.server";
import { activateTierServer, getSubscriptionProfileServer } from "@/lib/subscription/subscription.server";
import type { ActivationMethod, SubscriptionTier, SupportProposal } from "@/types/subscription";
import { normalizeAdminTier } from "@/lib/subscription/constants";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SetTierBody = {
  userId?: string;
  tier?: string;
  supportProposal?: SupportProposal;
  activationMethod?: "admin" | "wire";
};

export async function POST(request: Request) {
  const admin = await requirePlatformAdmin(request);
  if (admin instanceof NextResponse) return admin;

  let body: SetTierBody;
  try {
    body = (await request.json()) as SetTierBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const userId = body.userId?.trim();
  const tier = normalizeAdminTier(body.tier ?? "");
  if (!userId || !tier) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const method =
    body.activationMethod === "wire" ? "wire" : ("admin" satisfies ActivationMethod);
  const profile = await activateTierServer(userId, tier as SubscriptionTier, method, {
    grantedByAdminUid: tier === "full_free" ? admin.uid : undefined,
    supportProposal: body.supportProposal,
  });

  return NextResponse.json({ profile });
}

export async function GET(request: Request) {
  const admin = await requirePlatformAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const userId = new URL(request.url).searchParams.get("userId")?.trim();
  if (!userId) {
    return NextResponse.json({ error: "missing_user_id" }, { status: 400 });
  }

  const profile = await getSubscriptionProfileServer(userId);
  return NextResponse.json({ profile });
}
