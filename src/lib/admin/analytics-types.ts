import type { ArticleCreationMode, SupportProductionStatus } from "@/types/workspace";
import type { SubscriptionTier } from "@/types/subscription";
import type { SubscriptionAccess } from "@/types/subscription";

export type SupportProductionCounts = Record<SupportProductionStatus, number>;

export type SupportDeliveryStatus = "on_track" | "at_risk" | "over_quota";

export type AdminWorkspaceMetrics = {
  ownerId: string;
  accountId: string;
  accountName: string;
  ownerEmail: string;
  ownerDisplayName: string | null;
  tier: SubscriptionTier;
  linkedClientUid: string | null;
  linkedClientEmail: string | null;
  linkedClientDisplayName: string | null;
  validatedTotal: number;
  validatedThisMonth: number;
  productionCounts: SupportProductionCounts;
  productionThisMonth: SupportProductionCounts;
};

export type ConnectionGranularity =
  | "day"
  | "week"
  | "month1"
  | "month3"
  | "month6"
  | "year1"
  | "all";

export const CONNECTION_PERIOD_KEYS: ConnectionGranularity[] = [
  "day",
  "week",
  "month1",
  "month3",
  "month6",
  "year1",
  "all",
];

export type ConnectionBucket = {
  label: string;
  shortLabel: string;
  uniqueUsers: number;
  /** Users who logged in during this bucket — enables client-side filter. */
  userIds: string[];
};

export type AdminUserMetrics = {
  userId: string;
  email: string;
  displayName: string | null;
  linkedinUrl: string | null;
  createdAt: string | null;
  accountCount: number;
  completionPercent: number;
  draftArticles: number;
  reworkedArticles: number;
  validatedArticles: number;
  totalArticles: number;
  articleModeCounts: Record<ArticleCreationMode, number>;
  loginHits: number;
  lastLoginAt: string | null;
  usageScore: number;
  subscriptionTier: SubscriptionTier;
  effectiveTier: SubscriptionTier;
  isExpired: boolean;
  isTrialActive: boolean;
  postsRemaining: number | null;
  blockReason: SubscriptionAccess["blockReason"] | null;
  isPlatformAdmin: boolean;
  /** Excluded from stats by default (platform admin / test). */
  excludeFromStatsDefault: boolean;
  usesPlatformLlm: boolean;
  onboardingSteps: {
    llm: boolean;
    author: boolean;
    audience: boolean;
    persona: boolean;
    firstArticle: boolean;
    firstValidated: boolean;
  };
  activationMethod?: string | null;
  hasStripeSubscription: boolean;
  /** Platform admin UID managing this user (agency model). */
  managedByAdminUid: string | null;
};

export type SupportAccountRow = {
  userId: string;
  email: string;
  displayName: string | null;
  tier: SubscriptionTier;
  ownedWorkspaces: number;
  linkedClients: number;
  validatedPosts: number;
  monthlyQuota: number;
  deliveredThisMonth: number;
  remainingQuota: number;
  deliveryStatus: SupportDeliveryStatus;
  revenueUsd: number;
  llmCostUsd: number;
  humanCostUsd: number;
  estimatedMarginUsd: number;
  productionCounts: SupportProductionCounts;
  productionThisMonth: SupportProductionCounts;
  workspaces: AdminWorkspaceMetrics[];
  /** @deprecated Use remainingQuota */
  postsRemaining: number | null;
};

export type AdminLlmUsageSummary = {
  platformCalls: number;
  platformTokens: number;
  platformCostUsd: number;
};

export type AdminAnalyticsPayload = {
  generatedAt: string;
  totals: {
    registeredUsers: number;
    workspaceAccounts: number;
    totalArticles: number;
    draftArticles: number;
    reworkedArticles: number;
    validatedArticles: number;
    averageCompletionPercent: number;
  };
  connections: Record<ConnectionGranularity, ConnectionBucket[]>;
  users: AdminUserMetrics[];
  supportAccounts: SupportAccountRow[];
  /** Flat list of Support-tier workspace accounts (agency drill-down). */
  workspaceAccounts: AdminWorkspaceMetrics[];
  supportProductionTotals: SupportProductionCounts;
  llmUsage: AdminLlmUsageSummary;
};
