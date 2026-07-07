import { linkedInActivityUrlsFromProfile, migrateWebSources } from "@/lib/profile/author-reference-urls";
import { serializeSourcesForPersona } from "@/lib/workspace/serialize-sources";
import type {
 AudienceProfile,
 AuthorProfile,
 AuthorReferenceUrl,
 ContentArchetype,
 CreationStrategyCache,
 CreationStrategyGuide,
 GapAnswerValue,
 ProfileEnrichment,
 SourceLink,
} from "@/types/workspace";

/** Serializable steering bundle sent with LLM API calls. */
export type AuthorSteeringPayload = {
 author?: {
 roleTitle?: string;
 positioningLine?: string;
 contentArchetype?: ContentArchetype;
 linkedinProfileUrl?: string;
 linkedinActivityUrl?: string;
 linkedinActivitySources?: AuthorReferenceUrl[];
 websiteUrl?: string;
 blogUrl?: string;
 webSources?: AuthorReferenceUrl[];
 contentLanguage?: string;
 creationStrategySteering?: string;
 };
 audience?: {
 targetLabel?: string;
 contentFocus?: string;
 contentNiche?: string;
 newsInterestQuery?: string;
 optionalNotes?: string;
 skipped?: boolean;
 };
 profileEnrichment?: Record<string, unknown>;
 linkedInPositioning?: {
 activityUrl?: string;
 activityUrls?: string[];
 analyzedAt?: string;
 periodLabel?: string;
 patternSummary?: string;
 recommendedMode?: string;
 modeJustification?: string;
 postsAnalyzed?: number;
 recentThemes?: { title: string; relationToHistory: string; angle: string }[];
 activeSteering?: string;
 };
 myPosts?: { type: string; url: string; label?: string }[];
 inspirationPosts?: { url: string; label?: string; likedAspects?: string[]; whyLike?: string }[];
 inspirationProfiles?: { url: string; label?: string; likedAspects?: string[]; whyLike?: string }[];
 bioReferenceDocuments?: { label: string; kind: string; sourceUrl?: string; text: string }[];
};

export const AUTHOR_STEERING_PROMPT_RULE = `
Author steering (when "authorSteering" is in the user JSON):
- All fields are live constraints that evolve output together with the Persona: audience focus, news keywords, enrichment answers, LinkedIn activity history, strategy steering text, reference URLs, and bioReferenceDocuments (extracted CV/bio text).
- Honor linkedInPositioning from the last activity analysis (patterns, themes, recommended path) unless steering explicitly requests a pivot.
- newsInterestQuery and creationStrategySteering override generic Persona defaults when they conflict.
- contentNiche (when set) is the owned niche anchor: one reader, one problem — honor it unless the brief explicitly pivots.
- contentArchetype (expert | founder_product | hybrid) steers whether posts lead with expertise vs category/product proof — follow Persona rules for that archetype.
- Never invent facts not supported by Persona, enrichment, or referenced URLs.`;

function summarizeStrategyCache(
 author: AuthorProfile | null | undefined,
 cache?: CreationStrategyCache | null,
): AuthorSteeringPayload["linkedInPositioning"] | undefined {
 const guide: CreationStrategyGuide | undefined = cache?.guide;
 if (!guide && linkedInActivityUrlsFromProfile(author).length === 0) return undefined;

 return {
 activityUrl: cache?.activityUrl ?? linkedInActivityUrlsFromProfile(author)[0],
 activityUrls:
 cache?.activityUrls?.length
 ? cache.activityUrls
 : linkedInActivityUrlsFromProfile(author),
 analyzedAt: cache?.analyzedAt,
 periodLabel: guide?.periodLabel,
 patternSummary: guide?.patternSummary,
 recommendedMode: guide?.recommendedMode,
 modeJustification: guide?.modeJustification,
 postsAnalyzed: guide?.postsAnalyzed,
 recentThemes: guide?.themes?.map((t) => ({
 title: t.title,
 relationToHistory: t.relationToHistory,
 angle: t.angle,
 })),
 activeSteering:
 author?.creationStrategySteering?.trim() || cache?.steering?.trim() || undefined,
 };
}

export function buildAuthorSteeringPayload(input: {
 author?: AuthorProfile | null;
 audience?: AudienceProfile | null;
 enrichment?: ProfileEnrichment | null;
 sources?: SourceLink[];
 newsInterestQuery?: string;
 bioReferenceDocuments?: AuthorSteeringPayload["bioReferenceDocuments"];
}): AuthorSteeringPayload {
 const { author, audience, enrichment, sources = [] } = input;
 const newsInterest =
 input.newsInterestQuery?.trim() ||
 audience?.newsInterestQuery?.trim() ||
 audience?.contentFocus?.trim() ||
 "";

 const { myPosts, inspirationPosts, inspirationProfiles } =
 serializeSourcesForPersona(sources);

 const payload: AuthorSteeringPayload = {};

 if (author) {
 payload.author = {
 roleTitle: author.roleTitle,
 positioningLine: author.positioningLine,
 contentArchetype: author.contentArchetype,
 linkedinProfileUrl: author.linkedinProfileUrl,
 linkedinActivityUrl: author.linkedinActivityUrl,
 linkedinActivitySources: author.linkedinActivitySources,
 websiteUrl: author.websiteUrl,
 blogUrl: author.blogUrl,
 webSources: author.webSources,
 contentLanguage: author.contentLanguage,
 creationStrategySteering: author.creationStrategySteering,
 };
 }

 if (audience && !audience.skipped) {
 payload.audience = {
 targetLabel: audience.targetLabel,
 contentFocus: audience.contentFocus,
 contentNiche: audience.contentNiche,
 newsInterestQuery: newsInterest || undefined,
 optionalNotes: audience.optionalNotes,
 };
 } else if (newsInterest) {
 payload.audience = { newsInterestQuery: newsInterest };
 }

 const details = enrichment?.details;
 if (details && Object.keys(details).length > 0) {
 payload.profileEnrichment = details;
 }

 const positioning = summarizeStrategyCache(author, author?.creationStrategyCache);
 if (positioning) payload.linkedInPositioning = positioning;

 if (myPosts.length) payload.myPosts = myPosts;
 if (inspirationPosts.length) payload.inspirationPosts = inspirationPosts;
 if (inspirationProfiles.length) payload.inspirationProfiles = inspirationProfiles;
 if (input.bioReferenceDocuments?.length) {
   payload.bioReferenceDocuments = input.bioReferenceDocuments;
 }

 return payload;
}

export function resolveAuthorSteering(input: {
 authorSteering?: AuthorSteeringPayload | null;
 author?: Partial<AuthorProfile> | Record<string, unknown> | null;
 audience?: Partial<AudienceProfile> | Record<string, unknown> | null;
 profileEnrichment?: Record<string, unknown>;
 sources?: SourceLink[];
 newsInterestQuery?: string;
}): AuthorSteeringPayload | undefined {
 if (input.authorSteering && Object.keys(input.authorSteering).length > 0) {
 return input.authorSteering;
 }

 const hasLegacy =
 input.author ||
 input.audience ||
 (input.profileEnrichment && Object.keys(input.profileEnrichment).length > 0);

 if (!hasLegacy) return undefined;

 return buildAuthorSteeringPayload({
 author: (input.author ?? null) as AuthorProfile | null,
 audience: (input.audience ?? null) as AudienceProfile | null,
 enrichment: input.profileEnrichment
 ? ({
 details: input.profileEnrichment as Record<string, GapAnswerValue>,
 updatedAt: new Date(),
 } satisfies ProfileEnrichment)
 : null,
 sources: input.sources,
 newsInterestQuery: input.newsInterestQuery,
 });
}

export function injectAuthorSteering<T extends Record<string, unknown>>(
 payload: T,
 steering?: AuthorSteeringPayload | null,
): T {
 if (!steering || !hasSteeringContent(steering)) return payload;
 return { ...payload, authorSteering: steering };
}

/** Lighter steering for post revision · keeps voice/ICP without full source lists. */
export function slimAuthorSteeringForRevise(
 steering?: AuthorSteeringPayload | null,
): AuthorSteeringPayload | undefined {
 if (!steering) return undefined;

 const slim: AuthorSteeringPayload = {};

 if (steering.author) {
 slim.author = {
 roleTitle: steering.author.roleTitle,
 positioningLine: steering.author.positioningLine,
 contentArchetype: steering.author.contentArchetype,
 creationStrategySteering: steering.author.creationStrategySteering,
 };
 }

 if (steering.audience) {
 slim.audience = {
 targetLabel: steering.audience.targetLabel,
 contentFocus: steering.audience.contentFocus,
 newsInterestQuery: steering.audience.newsInterestQuery,
 };
 }

 if (steering.linkedInPositioning) {
 slim.linkedInPositioning = {
 patternSummary: steering.linkedInPositioning.patternSummary?.slice(0, 400),
 activeSteering: steering.linkedInPositioning.activeSteering,
 };
 }

 return hasSteeringContent(slim) ? slim : undefined;
}

function hasSteeringContent(s: AuthorSteeringPayload): boolean {
 return !!(
 s.author?.creationStrategySteering ||
 s.author?.positioningLine ||
 s.audience?.newsInterestQuery ||
 s.audience?.contentFocus ||
 s.linkedInPositioning?.patternSummary ||
 (s.profileEnrichment && Object.keys(s.profileEnrichment).length > 0) ||
 (s.myPosts && s.myPosts.length > 0) ||
 (s.inspirationPosts && s.inspirationPosts.length > 0) ||
 (s.bioReferenceDocuments && s.bioReferenceDocuments.length > 0)
 );
}
