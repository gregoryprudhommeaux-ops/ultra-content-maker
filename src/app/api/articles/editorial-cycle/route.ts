import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { chatCompletionJson, mergeUsageLog } from "@/lib/llm/chat";
import { resolveContentRouteLlm } from "@/lib/llm/resolve-content-route-llm";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildEditorialCycleSystemPrompt,
  buildEditorialCycleUserPrompt,
  isEditorialCycleObjective,
  normalizeEditorialCycle,
} from "@/lib/prompts/editorial-cycle";
import type {
  ContentLanguage,
  CreationStrategyGuide,
  LlmProvider,
} from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  objective: string;
  contentLanguage: string;
  personaPromptText: string;
  contentNiche?: string;
  roleTitle?: string;
  positioningLine?: string;
  strategyGuide?: CreationStrategyGuide;
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
    if (!body.personaPromptText?.trim() || !isEditorialCycleObjective(body.objective)) {
      throw new Error("invalid");
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const contentLanguage = (body.contentLanguage || "fr") as ContentLanguage;
  const llm = await resolveContentRouteLlm(userId, body.llm);
  if (!llm) {
    return NextResponse.json({ error: "no_llm_key" }, { status: 503 });
  }

  try {
    const raw = await chatCompletionJson(
      llm,
      [
        {
          role: "system",
          content: buildEditorialCycleSystemPrompt(contentLanguage),
        },
        {
          role: "user",
          content: buildEditorialCycleUserPrompt({
            objective: body.objective,
            personaExcerpt: body.personaPromptText,
            contentNiche: body.contentNiche,
            roleTitle: body.roleTitle,
            positioningLine: body.positioningLine,
            strategyGuide: body.strategyGuide ?? null,
          }),
        },
      ],
      mergeUsageLog(userId, "articles/editorial-cycle"),
    );

    const parsed = parseLlmJson<{ summary?: unknown; phases?: unknown }>(raw);
    const cycle = normalizeEditorialCycle(body.objective, parsed);
    if (!cycle) {
      return NextResponse.json(
        { error: "llm_request_failed", detail: "Invalid editorial cycle shape" },
        { status: 502 },
      );
    }

    return NextResponse.json({ cycle, model: llm.model });
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
