import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { resolveContentRouteLlm } from "@/lib/llm/resolve-content-route-llm";
import { chatCompletionJson, mergeUsageLog } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
  buildFirstCommentSystemPrompt,
  buildFirstCommentUserPrompt,
  ensureNewsSourceInFirstComment,
} from "@/lib/prompts/article-first-comment";
import { resolveAuthorSteering, type AuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import type {
  ArticleNewsSource,
  ContentLanguage,
  LlmProvider,
  PostBrief,
} from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  contentLanguage: string;
  hook: string;
  body: string;
  exportText?: string;
  postBrief?: PostBrief;
  personaPromptText: string;
  newsSource?: ArticleNewsSource;
  authorSteering?: AuthorSteeringPayload;
  profileEnrichment?: Record<string, unknown>;
  author?: Record<string, unknown>;
  audience?: Record<string, unknown>;
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
    if (!body.hook?.trim() || !body.body?.trim()) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const contentLanguage = (body.contentLanguage || "en") as ContentLanguage;
  const hasNewsSource = Boolean(body.newsSource?.url?.trim());
  const llm = await resolveContentRouteLlm(userId, body.llm);

  if (!llm) {
    return NextResponse.json({ error: "no_llm_key" }, { status: 503 });
  }

  const authorSteering = resolveAuthorSteering({
    authorSteering: body.authorSteering,
    author: body.author,
    audience: body.audience,
    profileEnrichment: body.profileEnrichment,
  });

  try {
    const raw = await chatCompletionJson(llm, [
      {
        role: "system",
        content: buildFirstCommentSystemPrompt(contentLanguage, hasNewsSource),
      },
      {
        role: "user",
        content: buildFirstCommentUserPrompt({
          hook: body.hook,
          body: body.body,
          exportText: body.exportText,
          postBrief: body.postBrief,
          personaExcerpt: body.personaPromptText ?? "",
          contentLanguage,
          newsSource: body.newsSource,
          authorSteering,
        }),
      },
    ], mergeUsageLog(userId, "articles/first-comment"));

    const parsed = parseLlmJson<{ comment?: string }>(raw);
    let comment = typeof parsed.comment === "string" ? parsed.comment.trim() : "";
    if (!comment) {
      return NextResponse.json({ error: "No comment in response" }, { status: 502 });
    }

    if (body.newsSource?.url) {
      comment = ensureNewsSourceInFirstComment(
        comment,
        body.newsSource,
        contentLanguage,
      );
    }

    return NextResponse.json({ comment, model: llm.model });
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
