import { analyzeCreationStrategy } from "@/lib/linkedin/analyze-creation-strategy";
import { validateLinkedInActivityUrl } from "@/lib/linkedin/activity-url";
import { resolveLlmConfigsForUrlFetch } from "@/lib/inspiration/fetch-url-excerpt";
import { getLlmConfig } from "@/lib/llm/config";
import { isInvalidApiKeyError } from "@/lib/llm/parse-json";
import {
  resolveAuthorSteering,
  type AuthorSteeringPayload,
} from "@/lib/profile/author-steering-context";
import type { ContentLanguage, CreationStrategyCache, LlmProvider } from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24h

type Body = {
  linkedinActivityUrl: string;
  contentLanguage?: string;
  personaPromptText: string;
  roleTitle?: string;
  positioningLine?: string;
  audienceFocus?: string;
  /** Angle, keywords, or leads to reorganize recommendations */
  userSteering?: string;
  authorSteering?: AuthorSteeringPayload;
  profileEnrichment?: Record<string, unknown>;
  author?: Record<string, unknown>;
  audience?: Record<string, unknown>;
  forceRefresh?: boolean;
  cached?: CreationStrategyCache | null;
  llm?: {
    provider: LlmProvider;
    apiKey: string;
    model?: string;
  };
};

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
    if (!body.linkedinActivityUrl?.trim() || !body.personaPromptText?.trim()) {
      throw new Error("invalid");
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const urlCheck = validateLinkedInActivityUrl(body.linkedinActivityUrl);
  if (urlCheck === "invalid") {
    return NextResponse.json({ error: "url_invalid" }, { status: 400 });
  }
  if (urlCheck === "not_activity") {
    return NextResponse.json({ error: "not_activity_url" }, { status: 400 });
  }

  const contentLanguage = (body.contentLanguage || "fr") as ContentLanguage;
  const activityUrl = body.linkedinActivityUrl.trim();
  const steering = body.userSteering?.trim().slice(0, 1500) ?? "";

  const cachedSteering = body.cached?.steering?.trim() ?? "";
  if (
    !body.forceRefresh &&
    body.cached?.activityUrl === activityUrl &&
    body.cached.guide &&
    body.cached.analyzedAt &&
    steering === cachedSteering
  ) {
    const age = Date.now() - new Date(body.cached.analyzedAt).getTime();
    if (age >= 0 && age < CACHE_MAX_AGE_MS) {
      return NextResponse.json({
        guide: body.cached.guide,
        cached: true,
        analyzedAt: body.cached.analyzedAt,
      });
    }
  }

  const userLlm = body.llm?.apiKey?.trim()
    ? resolveLlmConfigsForUrlFetch({
        provider: body.llm.provider,
        apiKey: body.llm.apiKey.trim(),
        model: body.llm.model,
      })
    : null;

  const envLlm = getLlmConfig();
  const primary = userLlm?.primary ?? envLlm;
  if (!primary) {
    return NextResponse.json({ error: "no_llm_key" }, { status: 503 });
  }

  const perplexity =
    userLlm?.perplexity ?? (envLlm?.provider === "perplexity" ? envLlm : null);

  if (!perplexity) {
    return NextResponse.json(
      { error: "linkedin_requires_perplexity", perplexityRecommended: true },
      { status: 422 },
    );
  }

  const authorSteering = resolveAuthorSteering({
    authorSteering: body.authorSteering,
    author: body.author,
    audience: body.audience,
    profileEnrichment: body.profileEnrichment,
  });

  try {
    const { guide } = await analyzeCreationStrategy({
      activityUrl,
      contentLanguage,
      personaPromptText: body.personaPromptText,
      authorContext: {
        roleTitle: body.roleTitle,
        positioningLine: body.positioningLine,
        audienceFocus: body.audienceFocus,
      },
      userSteering: steering || undefined,
      authorSteering,
      strategyLlm: primary,
      fetchLlm: perplexity,
    });

    const analyzedAt = new Date().toISOString();
    return NextResponse.json({
      guide,
      cached: false,
      analyzedAt,
      cache: {
        activityUrl,
        analyzedAt,
        guide,
        steering: steering || undefined,
      } satisfies CreationStrategyCache,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown";

    if (message === "strategy_parse_failed") {
      return NextResponse.json({ error: "strategy_parse_failed" }, { status: 502 });
    }
    if (isInvalidApiKeyError(message)) {
      return NextResponse.json({ error: "invalid_api_key" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "analysis_failed", detail: message },
      { status: 502 },
    );
  }
}
