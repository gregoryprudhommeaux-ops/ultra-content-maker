import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { runCredibilityChecklist } from "@/lib/articles/credibility-checklist";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { resolveContentRouteLlm } from "@/lib/llm/resolve-content-route-llm";
import { chatCompletionJson, mergeUsageLog } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import { resolveContentArchetype } from "@/lib/persona/content-archetype";
import {
  buildOrganizationPromptBlock,
  parseOrganizationProfile,
  showsOrganizationProfileFields,
} from "@/lib/persona/organization-enrichment";
import {
  buildCredibilityAuditSystemPrompt,
  buildCredibilityAuditUserPrompt,
  normalizeCredibilityAudit,
} from "@/lib/prompts/article-credibility-audit";
import { resolveWorkspaceScopeForUser } from "@/lib/workspace/resolve-workspace-scope.server";
import { readWorkspaceSingletonDoc } from "@/lib/workspace/workspace-read.server";
import type { AuthorProfile, ContentLanguage, GapAnswerValue, LlmProvider } from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  contentLanguage: string;
  hook: string;
  body: string;
  ps?: string;
  llm?: {
    provider: LlmProvider;
    apiKey: string;
    model?: string;
  };
};

export async function POST(request: Request) {
  const userId = await verifyBearerUserId(request.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
    if (!body.body?.trim() || !body.contentLanguage) {
      throw new Error("invalid");
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const contentLanguage = body.contentLanguage as ContentLanguage;
  const llm = await resolveContentRouteLlm(userId, body.llm);
  if (!llm) {
    return NextResponse.json({ error: "no_llm_key" }, { status: 503 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_firestore_unavailable" }, { status: 503 });
  }

  const scope = await resolveWorkspaceScopeForUser(db, userId);
  const [authorDoc, enrichmentDoc] = await Promise.all([
    readWorkspaceSingletonDoc(db, scope, "author", "profile"),
    readWorkspaceSingletonDoc(db, scope, "enrichment", "profile"),
  ]);
  const details = (enrichmentDoc?.details as Record<string, GapAnswerValue> | undefined) ?? {};
  const archetype = resolveContentArchetype({
    author: authorDoc as Pick<
      AuthorProfile,
      "contentArchetype" | "roleTitle" | "positioningLine"
    > | null,
    profileEnrichment: details,
  });

  if (!showsOrganizationProfileFields(archetype)) {
    return NextResponse.json({ error: "not_org_mode" }, { status: 400 });
  }

  const org = parseOrganizationProfile(details);
  const orgBlock = buildOrganizationPromptBlock(details);
  const heuristicFails = runCredibilityChecklist(body.hook, body.body, body.ps, org)
    .filter((r) => r.status === "fail" || r.status === "warn")
    .map((r) => `${r.id}:${r.status}${r.detail ? ` (${r.detail})` : ""}`);

  try {
    const raw = await chatCompletionJson(
      llm,
      [
        { role: "system", content: buildCredibilityAuditSystemPrompt(contentLanguage) },
        {
          role: "user",
          content: buildCredibilityAuditUserPrompt({
            hook: body.hook,
            body: body.body,
            ps: body.ps,
            orgBlock,
            heuristicFails,
          }),
        },
      ],
      mergeUsageLog(userId, "articles/credibility-audit"),
    );

    const parsed = parseLlmJson<Record<string, unknown>>(raw);
    const audit = normalizeCredibilityAudit(parsed);
    if (!audit) {
      return NextResponse.json({ error: "Incomplete audit response" }, { status: 502 });
    }

    return NextResponse.json({ audit });
  } catch (e) {
    return NextResponse.json(
      {
        error: "llm_request_failed",
        detail: e instanceof Error ? e.message : "Unknown",
      },
      { status: 502 },
    );
  }
}
