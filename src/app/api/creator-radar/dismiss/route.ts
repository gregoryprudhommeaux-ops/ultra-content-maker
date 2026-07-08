import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { dismissCreatorRadarUrl } from "@/lib/creator-radar/creator-radar.server";
import { isLinkedInProfileUrl } from "@/lib/creator-radar/urls";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { canWriteWorkspace } from "@/lib/workspace/require-workspace-write.server";
import { resolveWorkspaceScopeForUser } from "@/lib/workspace/resolve-workspace-scope.server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  linkedinUrl?: string;
};

export async function POST(request: Request) {
  const userId = await verifyBearerUserId(request.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const linkedinUrl = body.linkedinUrl?.trim();
  if (!linkedinUrl || !isLinkedInProfileUrl(linkedinUrl)) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "server_unavailable" }, { status: 503 });
  }

  const workspace = await resolveWorkspaceScopeForUser(db, userId);
  if (!(await canWriteWorkspace(db, userId, workspace.ownerId, workspace.accountId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await dismissCreatorRadarUrl(workspace, linkedinUrl);
  return NextResponse.json({ ok: true });
}
