import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { buildNewsProfileContext } from "@/lib/news/profile-context";
import { normalizeNewsSuggestions } from "@/lib/news/normalize";
import { chatCompletionJson, mergeUsageLog } from "@/lib/llm/chat";
import { resolveRequestLlm } from "@/lib/llm/resolve-request-llm";
import { requireActiveSubscriptionLlm } from "@/lib/subscription/llm-gate.server";
import { parseLlmJson } from "@/lib/llm/parse-json";
import {
 buildNewsSuggestionsSystemPrompt,
 buildNewsSuggestionsUserPrompt,
} from "@/lib/prompts/news-suggestions";
import {
  gatherAuthorSteeringPayloadServer,
  readWorkspacePersonaExcerptServer,
} from "@/lib/profile/gather-author-steering.server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { canWriteWorkspace } from "@/lib/workspace/require-workspace-write.server";
import { resolveWorkspaceScopeForUser } from "@/lib/workspace/resolve-workspace-scope.server";
import type { AuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import type { ContentLanguage, LlmProvider } from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
 contentLanguage: string;
 author?: Record<string, unknown> | null;
 audience?: Record<string, unknown> | null;
 profileEnrichment?: Record<string, unknown>;
 personaExcerpt?: string;
 /** @deprecated use personaExcerpt · kept for older clients */
 personaPromptText?: string;
 newsInterestQuery?: string;
 authorSteering?: AuthorSteeringPayload;
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

 const subGate = await requireActiveSubscriptionLlm(userId, { premium: true });
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
 const llm = await resolveRequestLlm(userId, body.llm);

 if (!llm) {
 return NextResponse.json({ error: "no_llm_key" }, { status: 503 });
 }

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

 const newsInterestQuery =
 body.newsInterestQuery?.trim() ||
 authorSteering.audience?.newsInterestQuery?.trim() ||
 (typeof body.audience?.newsInterestQuery === "string"
 ? body.audience.newsInterestQuery.trim()
 : "");

 const profileContext = buildNewsProfileContext({
 author: (authorSteering.author ?? null) as Parameters<typeof buildNewsProfileContext>[0]["author"],
 audience: authorSteering.audience ?? null,
 profileEnrichment: authorSteering.profileEnrichment,
 personaExcerpt,
 newsInterestQuery,
 authorSteering,
 });

 try {
 const raw = await chatCompletionJson(llm, [
 {
 role: "system",
 content: buildNewsSuggestionsSystemPrompt(contentLanguage),
 },
 {
 role: "user",
 content: buildNewsSuggestionsUserPrompt(profileContext, newsInterestQuery),
 },
 ], mergeUsageLog(userId, "news/suggestions"));

 const parsed = parseLlmJson<{ news?: unknown }>(raw);
 const { news, rawCount, rejectedByAge, rejectedIncomplete } =
 normalizeNewsSuggestions(parsed);

 if (news.length === 0) {
 const error =
 rawCount === 0
 ? "no_llm_results"
 : rejectedByAge > 0 && rejectedIncomplete === 0
 ? "all_filtered_by_date"
 : "no_recent_news";

 return NextResponse.json(
 {
 error,
 stats: { rawCount, rejectedByAge, rejectedIncomplete },
 },
 { status: 502 },
 );
 }

 return NextResponse.json({
 news,
 provider: llm.provider,
 });
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
