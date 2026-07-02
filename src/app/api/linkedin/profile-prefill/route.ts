import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { fetchLinkedInProfilePrefill } from "@/lib/linkedin/fetch-profile-prefill";
import { resolveRequestLlm } from "@/lib/llm/resolve-request-llm";
import {
  classifyProviderErrorMessage,
  isInvalidApiKeyError,
  providerFromErrorMessage,
} from "@/lib/llm/provider-errors";
import { requireActiveSubscriptionLlm } from "@/lib/subscription/llm-gate.server";
import { isValidUrl } from "@/lib/workspace/firestore-utils";
import type { ContentLanguage } from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  linkedinProfileUrl: string;
  contentLanguage?: ContentLanguage;
};

export async function POST(request: Request) {
  const userId = await verifyBearerUserId(request.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subGate = await requireActiveSubscriptionLlm(userId);
  if (!subGate.ok) {
    return NextResponse.json(
      { error: subGate.code, subscription: subGate.access },
      { status: subGate.status },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
    const url = body.linkedinProfileUrl?.trim() ?? "";
    if (!url || !isValidUrl(url)) throw new Error("invalid");
    if (!/linkedin\.com\/in\//i.test(url)) throw new Error("not_profile");
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const llm = await resolveRequestLlm(userId);
  const contentLanguage = (body.contentLanguage ?? "fr") as ContentLanguage;

  try {
    const prefill = await fetchLinkedInProfilePrefill(
      body.linkedinProfileUrl.trim(),
      llm,
      contentLanguage,
      userId,
    );

    if (!prefill.accessible && !prefill.roleTitle && !prefill.positioningLine) {
      return NextResponse.json({ prefill, error: "profile_not_accessible" });
    }

    return NextResponse.json({ prefill });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "prefill_failed";
    const providerKind = classifyProviderErrorMessage(detail);
    const failedProvider = providerFromErrorMessage(detail);

    if (providerKind === "invalid_key" || isInvalidApiKeyError(detail)) {
      return NextResponse.json(
        { error: "invalid_api_key", detail, provider: failedProvider },
        { status: 401 },
      );
    }

    if (providerKind === "insufficient_credits") {
      return NextResponse.json(
        { error: "insufficient_credits", detail, provider: failedProvider },
        { status: 402 },
      );
    }

    return NextResponse.json({ error: "prefill_failed", detail }, { status: 502 });
  }
}
