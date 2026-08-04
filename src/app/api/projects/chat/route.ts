import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { chatCompletionJson, mergeUsageLog } from "@/lib/llm/chat";
import { llmErrorResponse } from "@/lib/llm/llm-route-error";
import { parseLlmJson } from "@/lib/llm/parse-json";
import { resolveContentRouteLlm } from "@/lib/llm/resolve-content-route-llm";
import { isProjectFrameReady, parseLucyChatResponse } from "@/lib/projects/content-project";
import {
  buildLucyProjectChatSystemPrompt,
  buildLucyProjectChatUserPayload,
} from "@/lib/prompts/lucy-project-chat";
import type {
  ContentLanguage,
  ContentProject,
  ContentProjectChatMessage,
  ContentProjectIdeaHit,
  LlmProvider,
} from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  projectId: string;
  project: Pick<
    ContentProject,
    | "name"
    | "brief"
    | "channelOwner"
    | "productFrame"
    | "contentLanguage"
    | "contentJob"
    | "emojiLevel"
    | "preferredCtaStyle"
    | "includeSignaturePs"
    | "ideas"
  >;
  ideas?: ContentProjectIdeaHit[];
  siblings?: Pick<ContentProject, "id" | "name" | "brief">[];
  history?: ContentProjectChatMessage[];
  userMessage: string;
  personaExcerpt?: string;
  profileReadyForNews?: boolean;
  hasDraft?: boolean;
  contentLanguage?: ContentLanguage;
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
    if (!body.projectId?.trim() || !body.userMessage?.trim() || !body.project?.name) {
      throw new Error("invalid");
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const contentLanguage: ContentLanguage =
    body.contentLanguage ?? body.project.contentLanguage ?? "fr";
  const profileReadyForNews = Boolean(body.profileReadyForNews);
  const ideas = body.ideas ?? body.project.ideas ?? [];
  const hasDraft = Boolean(body.hasDraft);
  const frameReady = isProjectFrameReady({
    contentLanguage: body.project.contentLanguage,
    contentJob: body.project.contentJob,
    brief: body.project.brief,
    ideas,
  });

  try {
    const llm = await resolveContentRouteLlm(userId, body.llm);
    if (!llm) {
      return NextResponse.json({ error: "no_llm_key" }, { status: 400 });
    }
    const raw = await chatCompletionJson(
      llm,
      [
        {
          role: "system",
          content: buildLucyProjectChatSystemPrompt(contentLanguage, {
            profileReadyForNews,
            hasDraft,
            frameReady,
          }),
        },
        {
          role: "user",
          content: buildLucyProjectChatUserPayload({
            project: body.project,
            ideas,
            siblings: body.siblings ?? [],
            projectId: body.projectId,
            history: body.history ?? [],
            userMessage: body.userMessage,
            personaExcerpt: body.personaExcerpt,
            profileReadyForNews,
            hasDraft,
          }),
        },
      ],
      mergeUsageLog(userId, "projects/lucy-chat", {
        temperature: 0.4,
        maxTokens: 1400,
      }),
    );

    const parsedRaw = parseLlmJson<Record<string, unknown>>(raw);
    const parsed = parseLucyChatResponse(parsedRaw);
    if (!parsed) {
      return NextResponse.json({ error: "empty_reply" }, { status: 502 });
    }

    // Guard: never hand the UI a readyToGenerate when the persisted frame (or the
    // accompanying framePatch) still cannot unlock generation.
    let pendingProposal = parsed.pendingProposal ?? null;
    const framePatch = parsed.framePatch ?? null;
    if (pendingProposal?.field === "readyToGenerate" && !frameReady) {
      const projected = framePatch
        ? {
            contentLanguage:
              framePatch.contentLanguage ?? body.project.contentLanguage,
            contentJob: framePatch.contentJob ?? body.project.contentJob,
            brief: body.project.brief,
            ideas: framePatch.angle
              ? [
                  ...(ideas ?? []),
                  {
                    id: "projected",
                    title: framePatch.angle,
                    stars: 4 as const,
                    reason: "",
                    source: "lucy" as const,
                  },
                ]
              : ideas,
          }
        : null;
      const wouldBeReady = projected ? isProjectFrameReady(projected) : false;
      if (!wouldBeReady) {
        pendingProposal = null;
      }
    }

    return NextResponse.json({
      reply: parsed.reply,
      pendingProposal,
      suggestedIdea: parsed.suggestedIdea ?? null,
      choices: parsed.choices ?? null,
      framePatch,
    });
  } catch (err) {
    return llmErrorResponse(err);
  }
}
