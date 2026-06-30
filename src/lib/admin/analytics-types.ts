import type { ArticleCreationMode } from "@/types/workspace";

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
};
