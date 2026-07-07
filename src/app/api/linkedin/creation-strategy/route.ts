import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { analyzeCreationStrategy } from "@/lib/linkedin/analyze-creation-strategy";
import { validateLinkedInPostsFeedUrl } from "@/lib/linkedin/activity-url";
import {
  activityUrlsFingerprint,
  linkedInActivityUrlsFromProfile,
} from "@/lib/profile/author-reference-urls";
import { resolveContentRouteLlm } from "@/lib/llm/resolve-content-route-llm";
import {
  classifyProviderErrorMessage,
  isInvalidApiKeyError,
  providerFromErrorMessage,
} from "@/lib/llm/provider-errors";
import {
  resolveAuthorSteering,
  type AuthorSteeringPayload,
} from "@/lib/profile/author-steering-context";
import type { AuthorProfile, ContentLanguage, CreationStrategyCache, LlmProvider } from "@/types/workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24h

type Body = {
  linkedinActivityUrl?: string;
  linkedinActivityUrls?: string[];
  contentLanguage?: string;
  personaPromptText: string;
  roleTitle?: string;
  positioningLine?: string;
  audienceFocus?: string;
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

function resolveActivityUrls(body: Body): string[] {
  const fromArray = (body.linkedinActivityUrls ?? [])
    .map((url) => url.trim())
    .filter(Boolean);
  if (fromArray.length > 0) return fromArray;
  const legacy = body.linkedinActivityUrl?.trim();
  return legacy ? [legacy] : [];
}

export async function POST(request: Request) {
  const userId = await verifyBearerUserId(request.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
    const activityUrls = resolveActivityUrls(body);
    if (activityUrls.length === 0 || !body.personaPromptText?.trim()) {
      throw new Error("invalid");
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const activityUrls = resolveActivityUrls(body);
  for (const url of activityUrls) {
    const urlCheck = validateLinkedInPostsFeedUrl(url);
    if (urlCheck === "invalid") {
      return NextResponse.json({ error: "url_invalid" }, { status: 400 });
    }
    if (urlCheck === "not_activity") {
      return NextResponse.json({ error: "not_activity_url" }, { status: 400 });
    }
  }

  const contentLanguage = (body.contentLanguage || "fr") as ContentLanguage;
  const steering = body.userSteering?.trim().slice(0, 1500) ?? "";
  const fingerprint = activityUrlsFingerprint(activityUrls);

  const cachedSteering = body.cached?.steering?.trim() ?? "";
  const cachedFingerprint = activityUrlsFingerprint(
    body.cached?.activityUrls?.length
      ? body.cached.activityUrls
      : body.cached?.activityUrl
        ? [body.cached.activityUrl]
        : [],
  );

  if (
    !body.forceRefresh &&
    body.cached?.guide &&
    body.cached.analyzedAt &&
    steering === cachedSteering &&
    fingerprint === cachedFingerprint
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

  const llm = await resolveContentRouteLlm(userId, body.llm);

  if (!llm) {
    return NextResponse.json({ error: "no_llm_key" }, { status: 503 });
  }

  const authorSteering = resolveAuthorSteering({
    authorSteering: body.authorSteering,
    author: body.author as AuthorProfile | undefined,
    audience: body.audience,
    profileEnrichment: body.profileEnrichment,
  });

  try {
    const { guide } = await analyzeCreationStrategy({
      activityUrls,
      contentLanguage,
      personaPromptText: body.personaPromptText,
      userId,
      authorContext: {
        roleTitle: body.roleTitle,
        positioningLine: body.positioningLine,
        audienceFocus: body.audienceFocus,
      },
      userSteering: steering || undefined,
      authorSteering,
      strategyLlm: llm,
      fetchLlm: llm,
    });

    const analyzedAt = new Date().toISOString();
    return NextResponse.json({
      guide,
      cached: false,
      analyzedAt,
      cache: {
        activityUrl: activityUrls[0] ?? "",
        activityUrls,
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
    const providerKind = classifyProviderErrorMessage(message);
    const failedProvider = providerFromErrorMessage(message);

    if (providerKind === "insufficient_credits") {
      return NextResponse.json(
        { error: "insufficient_credits", detail: message, provider: failedProvider },
        { status: 402 },
      );
    }

    if (providerKind === "rate_limit") {
      return NextResponse.json(
        { error: "rate_limit", detail: message, provider: failedProvider },
        { status: 429 },
      );
    }

    if (providerKind === "invalid_key" || isInvalidApiKeyError(message)) {
      return NextResponse.json(
        { error: "invalid_api_key", detail: message, provider: failedProvider },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: "analysis_failed", detail: message, provider: failedProvider },
      { status: 502 },
    );
  }
}

/** Helper for server routes that already loaded AuthorProfile. */
export function activityUrlsFromAuthorProfile(
  profile: Pick<AuthorProfile, "linkedinActivitySources" | "linkedinActivityUrl"> | null | undefined,
): string[] {
  return linkedInActivityUrlsFromProfile(profile);
}
