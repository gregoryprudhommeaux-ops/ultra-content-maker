import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { classifyProviderErrorMessage } from "@/lib/llm/provider-errors";
import { assessCreatorRadarContext } from "@/lib/creator-radar/readiness";
import { getOrCreateDailyCreatorRadar } from "@/lib/creator-radar/creator-radar.server";
import {
  gatherAuthorSteeringPayloadServer,
  readWorkspacePersonaExcerptServer,
} from "@/lib/profile/gather-author-steering.server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  isPlatformManagedLlmUser,
  resolveContentRouteByokFallback,
  resolveContentRouteLlm,
} from "@/lib/llm/resolve-content-route-llm";
import { isPlatformApiKey } from "@/lib/llm/platform-key.server";
import { requireActiveSubscriptionLlm } from "@/lib/subscription/llm-gate.server";
import { canWriteWorkspace } from "@/lib/workspace/require-workspace-write.server";
import { resolveWorkspaceScopeForUser } from "@/lib/workspace/resolve-workspace-scope.server";
import type { AuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import type { ContentLanguage, LlmProvider } from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  contentLanguage: string;
  personaExcerpt?: string;
  personaPromptText?: string;
  newsInterestQuery?: string;
  authorSteering?: AuthorSteeringPayload;
  llm?: {
    provider: LlmProvider;
    apiKey?: string;
    model?: string;
  };
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
    if (!body.contentLanguage) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const contentLanguage = body.contentLanguage as ContentLanguage;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "server_unavailable" }, { status: 503 });
  }

  const workspace = await resolveWorkspaceScopeForUser(db, userId);
  if (!(await canWriteWorkspace(db, userId, workspace.ownerId, workspace.accountId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const authorSteering = await gatherAuthorSteeringPayloadServer(db, workspace, {
    newsInterestQuery: body.newsInterestQuery?.trim() || undefined,
  });

  const personaFromWorkspace = await readWorkspacePersonaExcerptServer(db, workspace);
  const personaExcerpt =
    personaFromWorkspace ||
    body.personaExcerpt?.trim() ||
    body.personaPromptText?.trim() ||
    "";

  const readiness = assessCreatorRadarContext(personaExcerpt, authorSteering);
  if (!readiness.ok) {
    return NextResponse.json({ error: readiness.code }, { status: 422 });
  }

  const llm = await resolveContentRouteLlm(userId, body.llm, subGate.access);
  if (!llm) {
    const access = subGate.access;
    if (access.canUseOwnLlmOnly) {
      return NextResponse.json({ error: "own_llm_required" }, { status: 503 });
    }
    if (access.canUsePlatformLlm) {
      return NextResponse.json({ error: "platform_llm_unavailable" }, { status: 503 });
    }
    return NextResponse.json({ error: "no_llm_key" }, { status: 503 });
  }

  try {
    const byokFallback = await resolveContentRouteByokFallback(
      userId,
      body.llm,
      subGate.access,
    );
    const result = await getOrCreateDailyCreatorRadar({
      actorUserId: userId,
      workspace,
      contentLanguage,
      personaExcerpt,
      authorSteering,
      newsInterestQuery: body.newsInterestQuery?.trim(),
      llmConfig: llm,
      llmByokFallback: byokFallback,
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown";
    if (message === "no_llm_key") {
      return NextResponse.json({ error: "no_llm_key" }, { status: 503 });
    }
    if (message === "no_llm_results" || message === "no_valid_creators") {
      return NextResponse.json({ error: "no_creators_found" }, { status: 502 });
    }
    const usesPlatform =
      isPlatformManagedLlmUser(subGate.access) || isPlatformApiKey(llm.apiKey);
    const providerKind = classifyProviderErrorMessage(message);
    if (usesPlatform && providerKind === "invalid_key") {
      return NextResponse.json(
        { error: "platform_llm_unavailable", detail: message },
        { status: 503 },
      );
    }
    if (providerKind === "insufficient_credits") {
      return NextResponse.json(
        { error: "insufficient_credits", detail: message },
        { status: 402 },
      );
    }
    if (providerKind === "invalid_key") {
      return NextResponse.json(
        { error: "invalid_api_key", detail: message },
        { status: 401 },
      );
    }
    if (providerKind === "rate_limit") {
      return NextResponse.json(
        { error: "rate_limit", detail: message },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "llm_request_failed", detail: message },
      { status: 502 },
    );
  }
}
