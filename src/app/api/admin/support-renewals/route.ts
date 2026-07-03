import {
  extendSupportContract,
  listSupportRenewalsDue,
  markSupportContractNotRenewing,
} from "@/lib/billing/support-contract-renewal.server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin.server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  try {
    const renewals = await listSupportRenewalsDue(db);
    return NextResponse.json({ renewals });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "load_failed", detail }, { status: 500 });
  }
}

type PatchBody = {
  userId?: string;
  action?: "extend" | "not_renewing";
  months?: number;
};

export async function PATCH(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
    if (!body.userId?.trim()) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const userId = body.userId.trim();

  try {
    if (body.action === "extend") {
      const result = await extendSupportContract(db, userId, body.months);
      return NextResponse.json(result);
    }
    if (body.action === "not_renewing") {
      const contract = await markSupportContractNotRenewing(userId);
      return NextResponse.json({ contract });
    }
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "update_failed", detail }, { status: 500 });
  }
}
