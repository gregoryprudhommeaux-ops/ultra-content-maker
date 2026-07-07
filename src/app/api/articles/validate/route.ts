import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  recordRetainedPostServer,
  requireRetainedPostAccess,
} from "@/lib/subscription/subscription.server";
import { normalizeHashtags } from "@/lib/linkedin/hashtags";
import type { CtaIntensity } from "@/types/workspace";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ValidateBody = {
  articleId: string;
  exportText: string;
  cta?: {
    ctaId?: string;
    style?: CtaIntensity;
    text?: string;
    linkUrl?: string;
  } | null;
  hashtags?: string[];
  hook?: string;
  body?: string;
  ps?: string;
};

export async function POST(request: Request) {
  const userId = await verifyBearerUserId(request.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ValidateBody;
  try {
    body = (await request.json()) as ValidateBody;
    if (!body.articleId?.trim() || !body.exportText?.trim()) {
      throw new Error("invalid");
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_firestore_unavailable" }, { status: 503 });
  }

  const articleRef = db.doc(`users/${userId}/articles/${body.articleId}`);
  const snap = await articleRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const data = snap.data() ?? {};
  const alreadyValidated = data.status === "validated";

  if (!alreadyValidated) {
    const gate = await requireRetainedPostAccess(userId);
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.code, subscription: gate.access },
        { status: gate.status },
      );
    }
  }

  const normalized = body.hashtags?.length ? normalizeHashtags(body.hashtags) : [];

  const ctaText = body.cta?.text?.trim() ?? "";

  const patch: Record<string, unknown> = {
    exportText: body.exportText,
    hashtags: normalized.length ? normalized : null,
    selectedCtaId: body.cta?.ctaId ?? null,
    selectedCtaStyle: ctaText ? (body.cta?.style ?? null) : null,
    selectedCtaText: ctaText || null,
    status: "validated",
    validatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (body.hook?.trim()) patch.hook = body.hook.trim();
  if (body.body?.trim()) patch.body = body.body.trim();
  if (body.ps !== undefined) patch.ps = body.ps?.trim() || null;

  await articleRef.update(patch);

  if (!alreadyValidated) {
    const profile = await recordRetainedPostServer(userId);
    const access = await import("@/lib/subscription/access").then((m) =>
      m.resolveSubscriptionAccess(profile),
    );
    return NextResponse.json({ ok: true, subscription: access });
  }

  return NextResponse.json({ ok: true });
}
