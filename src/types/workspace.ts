export type ContentLanguage = "en" | "fr" | "es";

/** Editorial positioning: expert consultant vs founder/CEO talking about a product. */
export type ContentArchetype = "expert" | "founder_product" | "hybrid";

import type { SubscriptionProfile } from "@/types/subscription";

export type SetupStep = "llm" | "express" | "author" | "audience" | "persona" | "articles" | "ready";

export type LlmProvider = "openai" | "perplexity" | "anthropic" | "google";

export type AuthorStatus = "not_started" | "in_progress" | "complete";

export type PersonaStatus = "none" | "draft" | "validated";

export type ArticleStatus = "draft" | "refining" | "validated";

/** Support Total production pipeline (admin-managed, not editorial status). */
export type SupportProductionStatus = "to_produce" | "client_review" | "published";

export type SourceType =
 | "linkedin_profile"
 | "linkedin_post"
 | "blog"
 | "website"
 | "other";

/** How this URL is used for Persona / content generation */
export type SourceCategory =
 | "my_post"
 | "inspiration_post"
 | "inspiration_profile";

export type InspirationAspect =
 | "tone"
 | "angle"
 | "subject"
 | "approach"
 | "content"
 | "format";

export interface UserLlmProfile {
 provider: LlmProvider;
 apiKey: string;
 /** True only when the user explicitly saved their own BYOK via the app UI. */
 userProvided?: boolean;
 model?: string;
 configuredAt: Date;
 updatedAt: Date;
}

export type LinkedWorkspace = {
 ownerId: string;
 accountId: string;
 accountName?: string;
};

/** Client-owned account managed by a platform admin (agency model). */
export type ManagedBy = {
 adminUid: string;
 linkedAt?: Date;
};

export type ManagedClientEntry = {
 clientUid: string;
 accountId: string;
 email: string;
 displayName?: string;
 linkedAt?: Date;
};

export interface UserDoc {
 email: string;
 displayName?: string;
 preferredLocale?: ContentLanguage;
 setupStep: SetupStep;
 /** Active workspace account (client) for multi-account admins. */
 activeAccountId?: string;
 /** Client invited to complete onboarding on an admin-owned workspace account. */
 linkedWorkspace?: LinkedWorkspace;
 /** Client accounts this admin manages (client-first agency model). */
 managedClients?: ManagedClientEntry[];
 /** Agency admin assigned to support this client's own account. */
 managedBy?: ManagedBy;
 isPlatformAdmin?: boolean;
 subscription?: SubscriptionProfile;
 createdAt: Date;
 updatedAt: Date;
}

export type ArticleCreationMode = "profile" | "news" | "inspiration" | "article";

export type CreationStrategyThemeRelation =
 | "continuity"
 | "correction"
 | "pivot"
 | "news";

export interface CreationStrategyTheme {
 title: string;
 angle: string;
 rationale: string;
 relationToHistory: CreationStrategyThemeRelation;
 suggestedMode: ArticleCreationMode;
 newsHook?: string;
}

export interface CreationStrategyGuide {
 postsAnalyzed: number;
 periodLabel: string;
 patternSummary: string;
 recommendedMode: ArticleCreationMode;
 modeJustification: string;
 themes: CreationStrategyTheme[];
}

export interface CreationStrategyCache {
 activityUrl: string;
 analyzedAt: string;
 guide: CreationStrategyGuide;
 /** Steering text used when this cache was built (empty = none). */
 steering?: string;
}

export type LinkedInDeliveryMode = "agency_publish" | "client_copy_paste";

export interface AuthorProfile {
  linkedinProfileUrl?: string;
 /** Public activity feed URL (recent posts) for AI pattern analysis. */
 linkedinActivityUrl?: string;
 websiteUrl?: string;
 blogUrl?: string;
 contentLanguage: ContentLanguage;
 roleTitle?: string;
 positioningLine?: string;
 /** Steers Persona + post generation: expert vs founder/product vs hybrid. */
 contentArchetype?: ContentArchetype;
 creationStrategyCache?: CreationStrategyCache;
 /** Optional angle / keywords to steer the next strategy analysis. */
  creationStrategySteering?: string;
  /** Support Total: agency publishes vs client copy-pastes on LinkedIn. */
  linkedInDeliveryMode?: LinkedInDeliveryMode;
  linkedInPublishAccessNotes?: string;
  status: AuthorStatus;
  updatedAt: Date;
}

export type AuthorBioDocumentKind = "file" | "link";

export interface AuthorBioDocument {
 id: string;
 kind: AuthorBioDocumentKind;
 label: string;
 mimeType?: string;
 sizeBytes?: number;
 storagePath?: string;
 sourceUrl?: string;
 extractedText: string;
 createdAt: Date;
 updatedAt: Date;
}

export interface AudienceProfile {
 targetLabel?: string;
 contentFocus?: string;
 /** Owned niche statement — one reader, one problem (editable; steers draft generation). */
 contentNiche?: string;
 /** Optional keywords / topics to steer news scan (wizard + API). */
 newsInterestQuery?: string;
 optionalNotes?: string;
 skipped?: boolean;
 updatedAt: Date;
}

export interface SourceLink {
 id: string;
 type: SourceType;
 url: string;
 label?: string;
 category: SourceCategory;
 likedAspects?: InspirationAspect[];
 whyLike?: string;
 sortOrder: number;
 createdAt: Date;
}

export type GapQuestionField = "author" | "audience" | "enrichment";

export type GapQuestionType = "single" | "multi" | "text" | "rank";

export interface ProfileGapQuestion {
 id: string;
 field: GapQuestionField;
 profileKey: string;
 label: string;
 hint?: string;
 type: GapQuestionType;
 options?: string[];
}

export type GapAnswerValue = string | string[];

export interface ProfileEnrichment {
 details: Record<string, GapAnswerValue>;
 updatedAt: Date;
}

export type PersonaUpdateSource =
 | "generate"
 | "profile_sync"
 | "feedback_sync"
 | "user_refinement"
 | "validate";

export interface PersonaRecentChange {
 summary: string;
 source: PersonaUpdateSource;
 at: Date;
}

export interface PersonaDoc {
 promptText: string;
 status: PersonaStatus;
 model?: string;
 gapQuestions?: ProfileGapQuestion[];
 validatedAt?: Date;
 updatedAt: Date;
 /** Monotonic version shown at the top of the prompt. */
 versionNumber?: number;
 recentChanges?: PersonaRecentChange[];
 /** Fingerprint of author + audience fields for change detection. */
 profileFingerprint?: string;
 /** Fingerprint of learning entry texts at last successful sync. */
 learningSyncHash?: string;
 /** Fingerprint of enrichment questionnaire answers. */
 enrichmentFingerprint?: string;
}

export type PersonaHistoryReason =
 | "generate"
 | "feedback_sync"
 | "profile_sync"
 | "user_refinement"
 | "validate"
 | "restore"
 | "before_restore";

export interface PersonaHistoryEntry {
 id: string;
 promptText: string;
 status: PersonaStatus;
 model?: string;
 gapQuestions?: ProfileGapQuestion[];
 reason: PersonaHistoryReason;
 createdAt: Date;
}

export interface CtaDoc {
 id: string;
 label: string;
 text: string;
 linkUrl?: string;
 isDefault?: boolean;
 createdAt: Date;
 updatedAt: Date;
}

export type RefinementAnswer = "yes" | "no" | "partial";

/** Emoji density in LinkedIn posts */
export type EmojiLevel = "none" | "light" | "heavy";

/** Post breadth: broad LinkedIn reach vs vertical-specific depth */
export type ArticleScope = "generalist" | "niche";

export type CtaIntensity = "soft" | "medium" | "pushy";

/** Why this post exists on LinkedIn (drives CTA + closing shape). */
export type PostObjective = "awareness" | "credibility" | "conversation" | "leads";

export type PostObjectivePriority = 1 | 2 | 3;

/** Article wizard: linkedin = expert post; personal = first-person authentic share. */
export type ArticleWritingStyle = "linkedin" | "personal";

export type RankedPostObjective = {
 objective: PostObjective;
 priority: PostObjectivePriority;
};

export interface PostBrief {
 /** Up to 3 ranked objectives (1 = primary). */
 objectives: RankedPostObjective[];
 problem: string;
 pointOfView: string;
 proof: string;
 /** Set in article-topic wizard only. */
 articleWritingStyle?: ArticleWritingStyle;
}

export interface ArticleQualityScores {
 nicheClarity: number;
 humanPov: number;
 proofDensity: number;
 conversationPotential: number;
}

/** Native LinkedIn content format (Phase 2). */
export type LinkedInPostFormat = "text_post" | "carousel" | "short_video";

export interface PostFormatPlan {
 primaryFormat: LinkedInPostFormat;
 rationale: string;
 alternativeFormats?: LinkedInPostFormat[];
}

export interface BriefNicheCheck {
 score: number;
 isTooGeneric: boolean;
 feedback: string;
 suggestions?: string[];
}

export interface CarouselSlide {
 title: string;
 bullets: string[];
}

export interface CarouselRepurpose {
 slides: CarouselSlide[];
 designNotes?: string;
}

export interface VideoScriptSegment {
 label: string;
 script: string;
 durationSec?: number;
}

export interface VideoScriptRepurpose {
 hookLine: string;
 segments: VideoScriptSegment[];
 closingLine: string;
 totalDurationSec?: number;
}

export interface ArticleRepurpose {
 carousel?: CarouselRepurpose;
 videoScript?: VideoScriptRepurpose;
}

export type ArticleTranslationMode = "literal" | "localized";

export interface ArticleTranslationVariant {
 mode: ArticleTranslationMode;
 hook: string;
 body: string;
 ps?: string;
 exportText?: string;
 hashtags?: string[];
 generatedAt: string;
}

/** Regional target locale for stored article translations. */
export type ArticleTranslationLocale = "fr" | "es-mx" | "es" | "en-gb" | "en-us";

/** Alternate-language versions of a validated post (key = target locale). */
export type ArticleTranslations = Partial<
 Record<ArticleTranslationLocale, ArticleTranslationVariant>
>;

/** Post-publication signals (manual entry, Phase 3). */
export interface ArticlePerformanceSignals {
 saves?: number;
 qualifiedComments?: number;
 profileVisits?: number;
 dms?: number;
 businessOpportunity?: string;
 notes?: string;
 /** ISO date when metrics were recorded */
 recordedAt?: string;
}

export interface SlopAnalysis {
 /** 1–10 authenticity / human voice (higher is better) */
 humanScore: number;
 /** 1–10 AI-slop intensity (higher is worse) */
 slopScore: number;
 flags: string[];
 summary: "empty" | "clean" | "mild_slop" | "heavy_slop";
}

export interface PersonaPerformanceInsights {
 summary: string;
 suggestions: string[];
 generatedAt: Date;
 postsAnalyzed: number;
}

export interface CtaSuggestion {
 style: CtaIntensity;
 text: string;
 linkUrl?: string;
}

export interface RefinementQuestion {
 id: string;
 questionKey: string;
 answer?: RefinementAnswer;
 comment?: string;
}

/** Per-article editorial tone shift (revision only, not global Persona default). */
export type ToneEdge = "default" | "corrosive";

export interface ArticleRefinement {
  questions: RefinementQuestion[];
  emojiLevel?: EmojiLevel;
  /** Corrosive / contrarian rewrite for this post */
  toneEdge?: ToneEdge;
  globalComment?: string;
  lastRegeneratedAt?: Date;
}

export interface DraftReviewFeedback {
  answers: Record<string, string>;
  submittedAt: string;
}

export type IllustrationFormat =
 | "photo"
 | "illustration"
 | "drawing"
 | "chart"
 | "graph"
 | "infographic"
 | "diagram"
 | "quote_card"
 | "screenshot_mockup";

export interface NewsSuggestion {
 id: string;
 title: string;
 summary: string;
 url: string;
 sourceName?: string;
 /** ISO date YYYY-MM-DD */
 publishedAt: string;
}

export interface ArticleNewsSource {
 title: string;
 summary: string;
 url: string;
 publishedAt: string;
 sourceName?: string;
}

export type InspirationInputKind = "paste" | "url" | "library" | "document";

/** Traceability when a post was generated from the inspiration wizard */
export interface ArticleInspirationSource {
 kind: InspirationInputKind;
 sourceId?: string;
 url: string;
 label?: string;
 category?: SourceCategory;
 likedAspects?: InspirationAspect[];
 whyLike?: string;
}

export interface ArticleIllustration {
 format: IllustrationFormat;
 rationale: string;
 /** Three short prompts for GenAI or image search engines */
 imagePrompts: [string, string, string];
 searchKeywords?: string;
 alternativeFormats?: IllustrationFormat[];
}

export interface ArticleDoc {
 id: string;
 batchId: string;
 indexInBatch: number;
 status: ArticleStatus;
 hook: string;
 body: string;
 ps?: string;
 illustration?: ArticleIllustration;
 newsSource?: ArticleNewsSource;
 inspirationSource?: ArticleInspirationSource;
 /** generalist = broad angle; niche = vertical / ICP-specific */
 scope?: ArticleScope;
 /** Up to 4 LinkedIn hashtags (without #), appended on export */
 hashtags?: string[];
 exportText?: string;
 selectedCtaId?: string;
 selectedCtaStyle?: CtaIntensity;
 selectedCtaText?: string;
 contentLanguage: ContentLanguage;
 refinement?: ArticleRefinement;
 /** Brief used when this batch was generated (v3). */
 postBrief?: PostBrief;
 qualityScores?: ArticleQualityScores;
 alternativeHooks?: string[];
 qualityCritique?: string;
 postFormatPlan?: PostFormatPlan;
 repurpose?: ArticleRepurpose;
 suggestedFirstComment?: string;
 /** Planned publish time (user reminder · not LinkedIn native scheduling). */
 scheduledPublishAt?: Date;
 performanceSignals?: ArticlePerformanceSignals;
 slopAnalysis?: SlopAnalysis;
 translations?: ArticleTranslations;
 createdAt: Date;
 updatedAt: Date;
  validatedAt?: Date;
  /** Support Total delivery pipeline — defaults to to_produce when unset. */
  productionStatus?: SupportProductionStatus;
  draftReviewToken?: string;
  clientReviewFeedback?: DraftReviewFeedback;
}

export { INPUT_CLASS, LABEL_CLASS } from "@/lib/ui/nextstep";
