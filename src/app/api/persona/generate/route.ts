import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { chatCompletionJson, mergeUsageLog } from "@/lib/llm/chat";
import { resolveRequestLlm } from "@/lib/llm/resolve-request-llm";
import { requireActiveSubscriptionLlm } from "@/lib/subscription/llm-gate.server";
import { parseLlmJson } from "@/lib/llm/parse-json";
import { normalizeGapQuestions } from "@/lib/persona/gap-questions";
import {
  buildPersonaSystemPrompt,
  buildPersonaUserPrompt,
} from "@/lib/prompts/persona-generate";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  listBioDocumentsServer,
  serializeBioDocumentsForPrompt,
} from "@/lib/workspace/bio-documents.server";
import { resolveWorkspaceScopeForUser } from "@/lib/workspace/resolve-workspace-scope.server";
import type {
  AudienceProfile,
  AuthorProfile,
  ContentLanguage,
  GapAnswerValue,
  LlmProvider,
  SourceLink,
} from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GenerateBody = {
  author: Record<string, unknown> | null;
  audience: Record<string, unknown> | null;
  sources: { type: string; url: string; label?: string }[];
  contentLanguage: string;
  profileEnrichment?: Record<string, GapAnswerValue>;
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

  const subGate = await requireActiveSubscriptionLlm(userId);
  if (!subGate.ok) {
    return NextResponse.json(
      { error: subGate.code, subscription: subGate.access },
      { status: subGate.status },
    );
  }

  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
    if (!body.contentLanguage || !Array.isArray(body.sources)) {
      throw new Error("invalid");
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const llm = await resolveRequestLlm(userId, body.llm);
  if (!llm) {
    return NextResponse.json(
      {
        error: "no_llm_key",
        message: "Configure your API key in setup",
      },
      { status: 503 },
    );
  }

  const contentLanguage = body.contentLanguage as ContentLanguage;
  const systemPrompt = buildPersonaSystemPrompt(contentLanguage);

  let bioReferenceDocuments: ReturnType<typeof serializeBioDocumentsForPrompt> = [];
  const db = getAdminFirestore();
  if (db) {
    const scope = await resolveWorkspaceScopeForUser(db, userId);
    const bioDocs = await listBioDocumentsServer(db, scope.ownerId, scope.accountId);
    bioReferenceDocuments = serializeBioDocumentsForPrompt(bioDocs);
  }

  const userContent = buildPersonaUserPrompt(
    body.author as AuthorProfile | null,
    body.audience as AudienceProfile | null,
    body.sources as SourceLink[],
    contentLanguage,
    body.profileEnrichment
      ? { details: body.profileEnrichment, updatedAt: new Date() }
      : null,
    bioReferenceDocuments,
  );

  let raw: string;
  try {
    raw = await chatCompletionJson(llm, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ], mergeUsageLog(userId, "persona/generate"));
  } catch (e) {
    return NextResponse.json(
      {
        error: "llm_request_failed",
        detail: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 502 },
    );
  }

  let parsed: {
    promptText?: string;
    gapQuestions?: unknown;
    gaps?: string[];
  };
  try {
    parsed = parseLlmJson<{
      promptText?: string;
      gapQuestions?: unknown;
      gaps?: string[];
    }>(raw);
  } catch {
    return NextResponse.json(
      { error: "invalid_model_json", detail: raw.slice(0, 200) },
      { status: 502 },
    );
  }

  if (!parsed.promptText || parsed.promptText.length < 200) {
    return NextResponse.json({ error: "Prompt too short" }, { status: 502 });
  }

  const gapQuestions = normalizeGapQuestions(
    parsed.gapQuestions,
    parsed.gaps,
  );

  return NextResponse.json({
    promptText: parsed.promptText,
    gapQuestions,
    model: llm.model,
    provider: llm.provider,
  });
}
