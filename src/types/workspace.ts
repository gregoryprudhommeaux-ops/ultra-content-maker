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

export interface ArticleRefinement {
  questions: RefinementQuestion[];
  emojiLevel?: EmojiLevel;
  globalComment?: string;
  lastRegeneratedAt?: Date;
}

export interface ArticleDoc {
  id: string;
  batchId: string;
  indexInBatch: number;
  status: ArticleStatus;
  hook: string;
  body: string;
  ps?: string;
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
  createdAt: Date;
  updatedAt: Date;
  validatedAt?: Date;
}

export { INPUT_CLASS, LABEL_CLASS } from "@/lib/ui/nextstep";
