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
  /** UI / conversation language (reply + choices). Independent from post production language. */
  chatLanguage?: ContentLanguage;
  /** @deprecated Use chatLanguage for conversation; project.contentLanguage for production. */
  contentLanguage?: ContentLanguage;
  llm?: {
    provider: LlmProvider;
    apiKey: string;
    model?: string;
  };
};

function normalizeChatLanguage(raw: unknown): ContentLanguage {
  if (raw === "en" || raw === "es" || raw === "fr") return raw;
  if (typeof raw === "string") {
    const v = raw.toLowerCase().slice(0, 2);
    if (v === "en" || v === "es" || v === "fr") return v;
  }
  return "fr";
}

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

  const chatLanguage = normalizeChatLanguage(body.chatLanguage ?? body.contentLanguage);
  const productionLanguage: ContentLanguage | null =
    body.project.contentLanguage ?? null;
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
          content: buildLucyProjectChatSystemPrompt(chatLanguage, {
            profileReadyForNews,
            hasDraft,
            frameReady,
            productionLanguage,
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
            chatLanguage,
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
    const sanitized = redirectDraftAwayFromChatReply(parsed.reply, chatLanguage);
    let reply = sanitized.reply;
    let pendingProposal = parsed.pendingProposal ?? null;
    let framePatch = parsed.framePatch ?? null;
    const briefPatch = parsed.briefPatch ?? null;

    // Only force generate flow when the user asked to generate, or Lucy dumped a real post.
    if (wantsGenerate || sanitized.redirected) {
      if (!pendingProposal || pendingProposal.field !== "readyToGenerate") {
        pendingProposal = {
          field: "readyToGenerate",
          value: true,
          label:
            chatLanguage === "es"
              ? "Listo para generar"
              : chatLanguage === "en"
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
      if (wantsGenerate) {
        reply =
          chatLanguage === "es"
            ? "El borrador se genera en el panel derecho — valida « listo para generar »."
            : chatLanguage === "en"
              ? "The draft will be generated in the right panel — validate “ready to generate”."
              : "Le brouillon se génère dans le panneau de droite — valide « prêt à générer ».";
      }
    }

    // Guard: never hand readyToGenerate when frame (incl. briefPatch) cannot unlock.
    if (pendingProposal?.field === "readyToGenerate" && !frameReady) {
      const projected = {
        contentLanguage:
          framePatch?.contentLanguage ?? body.project.contentLanguage,
        contentJob: framePatch?.contentJob ?? body.project.contentJob,
        brief: briefPatch ?? body.project.brief,
        ideas: framePatch?.angle
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
      };
      if (!isProjectFrameReady(projected)) {
        if (!projected.contentLanguage) {
          pendingProposal = {
            field: "contentLanguage",
            value: chatLanguage === "es" ? "es" : chatLanguage === "en" ? "en" : "fr",
            label:
              chatLanguage === "es"
                ? "Idioma del post"
                : chatLanguage === "en"
                  ? "Post language"
                  : "Langue du post",
          };
        } else if (!projected.contentJob) {
          pendingProposal = {
            field: "contentJob",
            value: "teaser",
            label: "Job · teaser",
          };
        } else {
          // Language + job ok → need brief|idea. Offer a brief draft from chat facts.
          const userBits = [
            ...(body.history ?? []),
            { role: "user" as const, content: body.userMessage },
          ]
            .filter((m) => m.role === "user")
            .map((m) => m.content.trim())
            .filter((c) => c.length >= 6 && c.length <= 220)
            .slice(-5);
          const draftBrief = [body.project.name, ...userBits]
            .filter(Boolean)
            .join(" · ")
            .trim();
          if (draftBrief.length >= 40) {
            pendingProposal = {
              field: "brief",
              value: draftBrief.slice(0, 1200),
              label:
                chatLanguage === "es"
                  ? "Brief del proyecto"
                  : chatLanguage === "en"
                    ? "Project brief"
                    : "Brief du projet",
            };
          } else {
            pendingProposal = null;
          }
        }
        if (sanitized.redirected && !wantsGenerate) {
          reply =
            chatLanguage === "es"
              ? "Aún falta encuadrar el post (idioma / job / brief). Sigamos con eso antes de generar."
              : chatLanguage === "en"
                ? "We still need to lock the frame (language / job / brief) before generating."
                : "Il manque encore le cadre (langue / job / brief). On verrouille ça avant de générer.";
        }
      }
    }

    return NextResponse.json({
      reply,
      pendingProposal,
      suggestedIdea: parsed.suggestedIdea ?? null,
      choices: parsed.choices ?? null,
      framePatch,
      newProjectSeed: parsed.newProjectSeed ?? null,
      briefPatch,
      autoGenerate: Boolean(
        wantsGenerate &&
          pendingProposal?.field === "readyToGenerate" &&
          isProjectFrameReady({
            contentLanguage:
              framePatch?.contentLanguage ?? body.project.contentLanguage,
            contentJob: framePatch?.contentJob ?? body.project.contentJob,
            brief: briefPatch ?? body.project.brief,
            ideas: framePatch?.angle
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
          }),
      ),
    });
  } catch (err) {
    return llmErrorResponse(err);
  }
}
