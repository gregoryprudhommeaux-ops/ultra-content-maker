import {
  buildInviteUrl,
  createAccountInvite,
} from "@/lib/admin/account-invites.server";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin.server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

type Body = {
  accountId: string;
  locale?: string;
};

export async function POST(request: Request) {
  const admin = await requirePlatformAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
    if (!body.accountId?.trim()) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const accountId = body.accountId.trim();
  const accountSnap = await db.doc(`users/${admin.uid}/accounts/${accountId}`).get();
  if (!accountSnap.exists) {
    return NextResponse.json({ error: "account_not_found" }, { status: 404 });
  }
  const accountName = String(accountSnap.data()?.name ?? "Compte client");

  const locale = body.locale?.trim() || "fr";
  const { token, expiresAt } = await createAccountInvite(db, {
    ownerId: admin.uid,
    accountId,
    accountName,
    createdBy: admin.uid,
  });

  const origin = new URL(request.url).origin;
  const url = buildInviteUrl(origin, locale, token);

  return NextResponse.json({
    token,
    url,
    expiresAt: expiresAt.toISOString(),
    accountName,
  });
}
