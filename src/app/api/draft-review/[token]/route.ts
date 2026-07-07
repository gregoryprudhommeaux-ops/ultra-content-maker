import {
  getDraftReviewByToken,
  submitDraftReview,
} from "@/lib/draft-review/tokens.server";
import { sendDraftReviewSubmittedEmail } from "@/lib/email/send-draft-review-submitted";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { token } = await context.params;
  const preview = await getDraftReviewByToken(db, token);
  if (!preview) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    status: preview.status,
    expiresAt: preview.expiresAt,
    article: preview.article,
  });
}

type PostBody = {
  answers?: Record<string, string>;
};

export async function POST(request: Request, context: RouteContext) {
  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { token } = await context.params;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const answers = body.answers ?? {};
  if (!Object.values(answers).some((v) => typeof v === "string" && v.trim())) {
    return NextResponse.json({ error: "answers_required" }, { status: 400 });
  }

  const preview = await getDraftReviewByToken(db, token);
  if (!preview) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (preview.status === "expired") {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }
  if (preview.status === "submitted") {
    return NextResponse.json({ error: "already_submitted" }, { status: 409 });
  }

  const result = await submitDraftReview(db, token, answers);
  if (!result.ok) {
    const status =
      result.error === "expired"
        ? 410
        : result.error === "already_submitted"
          ? 409
          : result.error === "not_found"
            ? 404
            : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  const tokenSnap = await db.collection("draftReviewTokens").doc(token).get();
  const tokenData = tokenSnap.data();
  if (tokenData) {
    await sendDraftReviewSubmittedEmail({
      ownerId: String(tokenData.ownerId),
      accountId: String(tokenData.accountId),
      articleId: String(tokenData.articleId),
      hook: preview.article.hook,
      answers,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
