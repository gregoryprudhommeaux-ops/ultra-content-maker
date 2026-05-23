export type ContentLanguage = "en" | "fr" | "es";

export type SetupStep = "llm" | "author" | "audience" | "persona" | "articles" | "ready";

export type LlmProvider = "openai" | "perplexity" | "anthropic" | "google";

export type AuthorStatus = "not_started" | "in_progress" | "complete";

export type PersonaStatus = "none" | "draft" | "validated";

export type ArticleStatus = "draft" | "refining" | "validated";

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
  model?: string;
  configuredAt: Date;
  updatedAt: Date;
}

export interface UserDoc {
  email: string;
  displayName?: string;
  preferredLocale?: ContentLanguage;
  setupStep: SetupStep;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthorProfile {
  linkedinProfileUrl?: string;
  websiteUrl?: string;
  blogUrl?: string;
  contentLanguage: ContentLanguage;
  roleTitle?: string;
  positioningLine?: string;
  status: AuthorStatus;
  updatedAt: Date;
}

export interface AudienceProfile {
  targetLabel?: string;
  contentFocus?: string;
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

export type GapQuestionType = "single" | "multi" | "text";

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

export interface PersonaDoc {
  promptText: string;
  status: PersonaStatus;
  model?: string;
  gapQuestions?: ProfileGapQuestion[];
  validatedAt?: Date;
  updatedAt: Date;
}

export type PersonaHistoryReason =
  | "generate"
  | "feedback_sync"
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

export interface PostBrief {
  objective: PostObjective;
  problem: string;
  pointOfView: string;
  proof: string;
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

export type InspirationInputKind = "paste" | "url" | "library";

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
  performanceSignals?: ArticlePerformanceSignals;
  slopAnalysis?: SlopAnalysis;
  createdAt: Date;
  updatedAt: Date;
  validatedAt?: Date;
}

export { INPUT_CLASS, LABEL_CLASS } from "@/lib/ui/nextstep";
