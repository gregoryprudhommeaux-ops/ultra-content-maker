import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { dismissCreatorRadarUrl } from "@/lib/creator-radar/creator-radar.server";
import { isLinkedInProfileUrl } from "@/lib/creator-radar/urls";
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

  await dismissCreatorRadarUrl(userId, linkedinUrl);
  return NextResponse.json({ ok: true });
}
