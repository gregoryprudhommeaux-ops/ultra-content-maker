import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { chatCompletionJson, mergeUsageLog } from "@/lib/llm/chat";
import { llmErrorResponse } from "@/lib/llm/llm-route-error";
import { parseLlmJson } from "@/lib/llm/parse-json";
import { resolveContentRouteLlm } from "@/lib/llm/resolve-content-route-llm";
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
  >;
  ideas?: ContentProjectIdeaHit[];
  siblings?: Pick<ContentProject, "id" | "name" | "brief">[];
  history?: ContentProjectChatMessage[];
  userMessage: string;
  personaExcerpt?: string;
  profileReadyForNews?: boolean;
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
          }),
        },
        {
          role: "user",
          content: buildLucyProjectChatUserPayload({
            project: body.project,
            ideas: body.ideas ?? [],
            siblings: body.siblings ?? [],
            projectId: body.projectId,
            history: body.history ?? [],
            userMessage: body.userMessage,
            personaExcerpt: body.personaExcerpt,
            profileReadyForNews,
          }),
        },
      ],
      mergeUsageLog(userId, "projects/lucy-chat", {
        temperature: 0.4,
        maxTokens: 700,
      }),
    );

    const parsed = parseLlmJson<{ reply?: string }>(raw);
    const reply = parsed.reply?.trim();
    if (!reply) {
      return NextResponse.json({ error: "empty_reply" }, { status: 502 });
    }
    return NextResponse.json({ reply });
  } catch (err) {
    return llmErrorResponse(err);
  }
}
