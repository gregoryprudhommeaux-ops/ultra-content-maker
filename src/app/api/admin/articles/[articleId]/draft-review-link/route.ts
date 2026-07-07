import { createDraftReviewToken } from "@/lib/draft-review/tokens.server";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin.server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { DEFAULT_ACCOUNT_ID } from "@/lib/workspace/workspace-scope";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ articleId: string }> };

type Body = {
  ownerId?: string;
  accountId?: string;
  locale?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const admin = await requirePlatformAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  const { articleId } = await context.params;
  if (!articleId?.trim()) {
    return NextResponse.json({ error: "invalid_article_id" }, { status: 400 });
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    // optional body
  }

  const ownerId = body.ownerId?.trim() || admin.uid;
  const accountId = body.accountId?.trim() || DEFAULT_ACCOUNT_ID;

  try {
    const result = await createDraftReviewToken(db, {
      userId: ownerId,
      accountId,
      articleId: articleId.trim(),
      createdBy: admin.uid,
      locale: body.locale,
    });
    return NextResponse.json(result);
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    if (detail === "article_not_found") {
      return NextResponse.json({ error: detail }, { status: 404 });
    }
    return NextResponse.json({ error: "create_failed", detail }, { status: 500 });
  }
}
