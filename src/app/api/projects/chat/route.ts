import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { chatCompletionJson, mergeUsageLog } from "@/lib/llm/chat";
import { llmErrorResponse } from "@/lib/llm/llm-route-error";
import { parseLlmJson } from "@/lib/llm/parse-json";
import { resolveContentRouteLlm } from "@/lib/llm/resolve-content-route-llm";
import {
  isGenerateIntent,
  isProjectFrameReady,
  parseLucyChatResponse,
  redirectDraftAwayFromChatReply,
} from "@/lib/projects/content-project";
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

    const wantsGenerate = isGenerateIntent(body.userMessage);
    const sanitized = redirectDraftAwayFromChatReply(parsed.reply, contentLanguage);
    let reply = sanitized.reply;
    let pendingProposal = parsed.pendingProposal ?? null;
    let framePatch = parsed.framePatch ?? null;

    // If Lucy dumped a post in chat (or the user asked to generate), steer to the
    // right-panel flow via readyToGenerate + framePatch instead of chat prose.
    if (sanitized.redirected || wantsGenerate) {
      if (!pendingProposal || pendingProposal.field !== "readyToGenerate") {
        pendingProposal = {
          field: "readyToGenerate",
          value: true,
          label:
            contentLanguage === "es"
              ? "Listo para generar"
              : contentLanguage === "en"
                ? "Ready to generate"
                : "Prêt à générer",
        };
      }
      if (!framePatch) {
        framePatch = {
          ...(body.project.contentLanguage
            ? { contentLanguage: body.project.contentLanguage }
            : {}),
          ...(body.project.contentJob ? { contentJob: body.project.contentJob } : {}),
          ...(body.project.emojiLevel ? { emojiLevel: body.project.emojiLevel } : {}),
          ...(body.project.preferredCtaStyle
            ? { preferredCtaStyle: body.project.preferredCtaStyle }
            : {}),
          ...(typeof body.project.includeSignaturePs === "boolean"
            ? { includeSignaturePs: body.project.includeSignaturePs }
            : {}),
          ...(body.project.channelOwner
            ? { channelOwner: body.project.channelOwner }
            : {}),
          ...(body.project.productFrame
            ? { productFrame: body.project.productFrame }
            : {}),
        };
        if (Object.keys(framePatch).length === 0) framePatch = null;
      }
      if (sanitized.redirected && wantsGenerate) {
        reply =
          contentLanguage === "es"
            ? "El borrador se genera en el panel derecho — valida « listo para generar »."
            : contentLanguage === "en"
              ? "The draft will be generated in the right panel — validate “ready to generate”."
              : "Le brouillon se génère dans le panneau de droite — valide « prêt à générer ».";
      }
    }

    // Guard: never hand the UI a readyToGenerate when the persisted frame (or the
    // accompanying framePatch) still cannot unlock generation.
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
                    stars: 4,
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
      reply,
      pendingProposal,
      suggestedIdea: parsed.suggestedIdea ?? null,
      choices: parsed.choices ?? null,
      framePatch,
      autoGenerate: Boolean(
        wantsGenerate &&
          pendingProposal?.field === "readyToGenerate" &&
          (frameReady ||
            (framePatch &&
              isProjectFrameReady({
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
                        stars: 4,
                        reason: "",
                        source: "lucy" as const,
                      },
                    ]
                  : ideas,
              }))),
      ),
    });
  } catch (err) {
    return llmErrorResponse(err);
  }
}
