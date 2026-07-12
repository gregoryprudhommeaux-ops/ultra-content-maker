import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { normalizeHashtags } from "@/lib/linkedin/hashtags";
import { resolveSubscriptionAccess } from "@/lib/subscription/access";
import {
  getSubscriptionAccessServer,
  recordRetainedPostServer,
} from "@/lib/subscription/subscription.server";
import { resolveArticleDocument } from "@/lib/workspace/article-doc.server";
import { registerPublishedTopicFromArticleServer } from "@/lib/workspace/published-topics.server";
import { isPlatformAdminUid } from "@/lib/workspace/platform-admin";
import { canWriteWorkspace } from "@/lib/workspace/require-workspace-write.server";
import { resolveWorkspaceScopeForUser } from "@/lib/workspace/resolve-workspace-scope.server";
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
  const actorUid = await verifyBearerUserId(request.headers.get("authorization"));
  if (!actorUid) {
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

  const scope = await resolveWorkspaceScopeForUser(db, actorUid);
  if (!(await canWriteWorkspace(db, actorUid, scope.ownerId, scope.accountId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const resolved = await resolveArticleDocument(
    db,
    scope.ownerId,
    scope.accountId,
    body.articleId.trim(),
  );
  if (!resolved) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const data = resolved.snap.data() ?? {};
  const alreadyValidated = data.status === "validated";
  const ownerId = scope.ownerId;

  if (!alreadyValidated) {
    const gateOpts = { isPlatformAdmin: isPlatformAdminUid(actorUid) };
    const access = await getSubscriptionAccessServer(ownerId, gateOpts);
    const canValidate = access.canGenerate || access.canExportLinkedIn;
    if (!canValidate) {
      const code =
        access.blockReason === "pro_plus_cap"
          ? "pro_plus_cap"
          : access.blockReason === "pro_cap"
            ? "pro_cap"
            : access.blockReason === "support_no_generate"
              ? "support_no_generate"
              : access.isExpired
                ? "subscription_expired"
                : "subscription_required";
      return NextResponse.json({ error: code, subscription: access }, { status: 402 });
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

  await resolved.ref.update(patch);

  if (!alreadyValidated) {
    const hook =
      body.hook?.trim() ||
      (typeof data.hook === "string" ? data.hook.trim() : "");
    const articleBody =
      body.body?.trim() ||
      (typeof data.body === "string" ? data.body.trim() : "");
    const editorialPillarId =
      typeof data.editorialPillarId === "string"
        ? data.editorialPillarId.trim()
        : undefined;
    let publishedTopicRegistered = true;
    if (hook || articleBody) {
      try {
        await registerPublishedTopicFromArticleServer(
          db,
          scope,
          body.articleId.trim(),
          hook,
          articleBody,
          editorialPillarId || undefined,
        );
      } catch {
        publishedTopicRegistered = false;
      }
    }

    const profile = await recordRetainedPostServer(ownerId);
    const access = resolveSubscriptionAccess(profile, {
      isPlatformAdmin: isPlatformAdminUid(actorUid),
    });
    return NextResponse.json({
      ok: true,
      subscription: access,
      publishedTopicRegistered,
    });
  }

  return NextResponse.json({ ok: true });
}
