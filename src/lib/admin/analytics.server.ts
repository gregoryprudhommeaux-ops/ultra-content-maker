import type { Firestore, DocumentData } from "firebase-admin/firestore";
import { emptyCreationModeCounts, tallyCreationModes } from "@/lib/articles/infer-creation-mode";
import { isValidUrl } from "@/lib/workspace/firestore-utils";
import type { LinkedWorkspace, ArticleCreationMode } from "@/types/workspace";
import { dateKeyFromDate, monthKeyFromDate, userLoginStatsRef } from "./record-login-event.server";
import {
  CONNECTION_PERIOD_KEYS,
  type AdminAnalyticsPayload,
  type AdminUserMetrics,
  type ConnectionBucket,
  type ConnectionGranularity,
} from "./analytics-types";

export type {
  AdminAnalyticsPayload,
  AdminUserMetrics,
  ConnectionBucket,
  ConnectionGranularity,
} from "./analytics-types";
export { CONNECTION_PERIOD_KEYS } from "./analytics-types";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function addDays(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + delta);
  return d;
}

function startOfUtcWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function toIsoDate(d: unknown): string | null {
  if (!d) return null;
  if (typeof d === "object" && d !== null && "toDate" in d && typeof (d as { toDate: () => Date }).toDate === "function") {
    return (d as { toDate: () => Date }).toDate().toISOString();
  }
  if (d instanceof Date) return d.toISOString();
  return null;
}

function isAudienceComplete(data: DocumentData | undefined): boolean {
  if (!data) return false;
  if (data.skipped === true) return true;
  return Boolean(String(data.targetLabel ?? "").trim() || String(data.contentFocus ?? "").trim());
}

function isAuthorComplete(data: DocumentData | undefined): boolean {
  if (!data) return false;
  const linkedin = String(data.linkedinProfileUrl ?? "").trim();
  return (
    linkedin.length > 0 &&
    isValidUrl(linkedin) &&
    Boolean(String(data.roleTitle ?? "").trim()) &&
    Boolean(String(data.positioningLine ?? "").trim()) &&
    Boolean(data.contentLanguage)
  );
}

type WorkspaceTarget = {
  ownerId: string;
  accountId?: string;
};

/** Where profile/articles live for this auth user (owner account vs invited client). */
function resolveWorkspaceTargets(
  userId: string,
  userData: DocumentData,
  ownedAccountIds: string[],
): WorkspaceTarget[] {
  const linked = userData.linkedWorkspace as LinkedWorkspace | undefined;
  if (linked?.ownerId && linked.accountId) {
    return [{ ownerId: linked.ownerId, accountId: linked.accountId }];
  }
  if (ownedAccountIds.length > 0) {
    return ownedAccountIds.map((accountId) => ({ ownerId: userId, accountId }));
  }
  return [{ ownerId: userId }];
}

function computeCompletionPercent(
  llm: DocumentData | undefined,
  author: DocumentData | undefined,
  audience: DocumentData | undefined,
  persona: DocumentData | undefined,
  articleCount: number,
): number {
  const steps = [
    Boolean(String(llm?.apiKey ?? "").trim()),
    author?.status === "complete" && isAuthorComplete(author),
    isAudienceComplete(audience),
    persona?.status === "validated",
    articleCount > 0,
  ];
  return Math.round((steps.filter(Boolean).length / steps.length) * 100);
}

function dailyUsersCollection(db: Firestore, dateKey: string) {
  return db.collection("analytics").doc("daily").collection(dateKey);
}

function monthlyUsersCollection(db: Firestore, monthKey: string) {
  return db.collection("analytics").doc("monthly").collection(monthKey);
}

async function countUniqueUsersForDay(db: Firestore, dateKey: string): Promise<number> {
  const snap = await dailyUsersCollection(db, dateKey).get();
  return snap.size;
}

async function uniqueUsersForDay(db: Firestore, dateKey: string): Promise<Set<string>> {
  const snap = await dailyUsersCollection(db, dateKey).get();
  return new Set(snap.docs.map((d) => d.id));
}

async function countUniqueUsersForMonth(db: Firestore, monthKey: string): Promise<number> {
  const snap = await monthlyUsersCollection(db, monthKey).get();
  return snap.size;
}

async function loadDailyBuckets(
  db: Firestore,
  dayCount: number,
): Promise<ConnectionBucket[]> {
  const today = new Date();
  const buckets: ConnectionBucket[] = [];
  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    const key = dateKeyFromDate(date);
    const uniqueUsers = await countUniqueUsersForDay(db, key);
    buckets.push({
      label: key,
      shortLabel: `${pad2(date.getUTCDate())}/${pad2(date.getUTCMonth() + 1)}`,
      uniqueUsers,
    });
  }
  return buckets;
}

async function loadWeeklyUnionBuckets(
  db: Firestore,
  weekCount: number,
): Promise<ConnectionBucket[]> {
  const weekStart = startOfUtcWeek(new Date());
  const buckets: ConnectionBucket[] = [];
  for (let w = weekCount - 1; w >= 0; w -= 1) {
    const start = addDays(weekStart, w * -7);
    const end = addDays(start, 6);
    const union = new Set<string>();
    const daySets = await Promise.all(
      Array.from({ length: 7 }, (_, d) =>
        uniqueUsersForDay(db, dateKeyFromDate(addDays(start, d))),
      ),
    );
    for (const ids of daySets) {
      ids.forEach((id) => union.add(id));
    }
    buckets.push({
      label: `${dateKeyFromDate(start)} → ${dateKeyFromDate(end)}`,
      shortLabel: `S${pad2(start.getUTCDate())}/${pad2(start.getUTCMonth() + 1)}`,
      uniqueUsers: union.size,
    });
  }
  return buckets;
}

async function loadMonthlyBuckets(
  db: Firestore,
  monthCount: number,
): Promise<ConnectionBucket[]> {
  const today = new Date();
  const buckets: ConnectionBucket[] = [];
  for (let i = monthCount - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    const key = monthKeyFromDate(date);
    const uniqueUsers = await countUniqueUsersForMonth(db, key);
    buckets.push({
      label: key,
      shortLabel: `${pad2(date.getUTCMonth() + 1)}/${String(date.getUTCFullYear()).slice(-2)}`,
      uniqueUsers,
    });
  }
  return buckets;
}

export async function loadConnectionBuckets(
  db: Firestore,
  granularity: ConnectionGranularity,
): Promise<ConnectionBucket[]> {
  switch (granularity) {
    case "day":
      return loadDailyBuckets(db, 14);
    case "week":
      return loadWeeklyUnionBuckets(db, 12);
    case "month1":
      return loadDailyBuckets(db, 30);
    case "month3":
      return loadWeeklyUnionBuckets(db, 13);
    case "month6":
      return loadMonthlyBuckets(db, 6);
    case "year1":
      return loadMonthlyBuckets(db, 12);
    case "all":
      return loadMonthlyBuckets(db, 48);
    default:
      return loadDailyBuckets(db, 14);
  }
}

type WorkspaceArticleStats = {
  total: number;
  drafts: number;
  reworked: number;
  validated: number;
  modeCounts: Record<ArticleCreationMode, number>;
};

function tallyArticles(docs: DocumentData[]): WorkspaceArticleStats {
  let drafts = 0;
  let reworked = 0;
  let validated = 0;

  for (const data of docs) {
    const status = data.status as string | undefined;
    if (status === "validated") validated += 1;
    else drafts += 1;

    const refinement = data.refinement as { lastRegeneratedAt?: unknown } | undefined;
    if (refinement?.lastRegeneratedAt) reworked += 1;
  }

  return {
    total: docs.length,
    drafts,
    reworked,
    validated,
    modeCounts: tallyCreationModes(docs),
  };
}

async function readDoc(
  db: Firestore,
  path: string,
): Promise<DocumentData | undefined> {
  const snap = await db.doc(path).get();
  return snap.exists ? snap.data() : undefined;
}

async function listArticles(
  db: Firestore,
  basePath: string,
): Promise<DocumentData[]> {
  const scoped = await db.collection(`${basePath}/articles`).get();
  if (!scoped.empty) return scoped.docs.map((d) => d.data());

  const legacyUserId = basePath.match(/^users\/([^/]+)/)?.[1];
  if (!legacyUserId) return [];
  const legacy = await db.collection(`users/${legacyUserId}/articles`).get();
  return legacy.docs.map((d) => d.data());
}

async function getWorkspaceStats(
  db: Firestore,
  llmUserId: string,
  workspaceOwnerId: string,
  accountId?: string,
): Promise<{
  completionPercent: number;
  linkedinUrl: string | null;
  articles: WorkspaceArticleStats;
}> {
  const base = accountId
    ? `users/${workspaceOwnerId}/accounts/${accountId}`
    : `users/${workspaceOwnerId}`;

  const [llm, authorScoped, audienceScoped, personaScoped, articles] = await Promise.all([
    readDoc(db, `users/${llmUserId}/llm/profile`),
    readDoc(db, `${base}/author/profile`),
    readDoc(db, `${base}/audience/profile`),
    readDoc(db, `${base}/persona/current`),
    listArticles(db, base),
  ]);

  const author =
    authorScoped ??
    (accountId
      ? undefined
      : await readDoc(db, `users/${workspaceOwnerId}/author/profile`));
  const audience =
    audienceScoped ??
    (accountId
      ? undefined
      : await readDoc(db, `users/${workspaceOwnerId}/audience/profile`));
  const persona =
    personaScoped ??
    (accountId
      ? undefined
      : await readDoc(db, `users/${workspaceOwnerId}/persona/current`));

  const articleStats = tallyArticles(articles);

  return {
    completionPercent: computeCompletionPercent(
      llm,
      author,
      audience,
      persona,
      articleStats.total,
    ),
    linkedinUrl: author?.linkedinProfileUrl
      ? String(author.linkedinProfileUrl)
      : null,
    articles: articleStats,
  };
}

async function getUserLoginStats(
  db: Firestore,
  userId: string,
): Promise<{ hits: number; lastLoginAt: string | null }> {
  const snap = await userLoginStatsRef(db, userId).get();
  if (!snap.exists) {
    return { hits: 0, lastLoginAt: null };
  }
  const data = snap.data()!;
  return {
    hits: typeof data.totalHits === "number" ? data.totalHits : 0,
    lastLoginAt: toIsoDate(data.lastLoginAt),
  };
}

export async function buildAdminAnalytics(db: Firestore): Promise<AdminAnalyticsPayload> {
  const [usersSnap, ...connectionSets] = await Promise.all([
    db.collection("users").get(),
    ...CONNECTION_PERIOD_KEYS.map((key) => loadConnectionBuckets(db, key)),
  ]);

  const connections = Object.fromEntries(
    CONNECTION_PERIOD_KEYS.map((key, index) => [key, connectionSets[index]]),
  ) as Record<ConnectionGranularity, ConnectionBucket[]>;

  const userRows: AdminUserMetrics[] = [];
  let workspaceAccounts = 0;
  let totalArticles = 0;
  let draftArticles = 0;
  let reworkedArticles = 0;
  let validatedArticles = 0;
  let completionSum = 0;

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    const userData = userDoc.data();
    const email = String(userData.email ?? "").trim() || "—";
    const linked = userData.linkedWorkspace as LinkedWorkspace | undefined;
    const displayName = userData.displayName
      ? String(userData.displayName)
      : linked?.accountName
        ? String(linked.accountName)
        : null;

    const accountsSnap = await db.collection(`users/${userId}/accounts`).get();
    const accountIds = accountsSnap.docs.map((d) => d.id);
    const workspaces = resolveWorkspaceTargets(userId, userData, accountIds);

    workspaceAccounts += workspaces.length;

    let userDrafts = 0;
    let userReworked = 0;
    let userValidated = 0;
    let userTotal = 0;
    let userCompletionSum = 0;
    let linkedinUrl: string | null = null;
    const userModeCounts = emptyCreationModeCounts();

    for (const { ownerId, accountId } of workspaces) {
      const stats = await getWorkspaceStats(db, userId, ownerId, accountId);
      userDrafts += stats.articles.drafts;
      userReworked += stats.articles.reworked;
      userValidated += stats.articles.validated;
      userTotal += stats.articles.total;
      userCompletionSum += stats.completionPercent;
      for (const mode of Object.keys(userModeCounts) as ArticleCreationMode[]) {
        userModeCounts[mode] += stats.articles.modeCounts[mode];
      }
      if (!linkedinUrl && stats.linkedinUrl) linkedinUrl = stats.linkedinUrl;
    }

    const completionPercent = Math.round(userCompletionSum / workspaces.length);
    const loginStats = await getUserLoginStats(db, userId);
    const usageScore = userTotal + userReworked * 2 + loginStats.hits;

    userRows.push({
      userId,
      email,
      displayName,
      linkedinUrl,
      createdAt: toIsoDate(userData.createdAt),
      accountCount: workspaces.length,
      completionPercent,
      draftArticles: userDrafts,
      reworkedArticles: userReworked,
      validatedArticles: userValidated,
      totalArticles: userTotal,
      articleModeCounts: userModeCounts,
      loginHits: loginStats.hits,
      lastLoginAt: loginStats.lastLoginAt,
      usageScore,
    });

    totalArticles += userTotal;
    draftArticles += userDrafts;
    reworkedArticles += userReworked;
    validatedArticles += userValidated;
    completionSum += completionPercent;
  }

  userRows.sort((a, b) => b.usageScore - a.usageScore);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      registeredUsers: usersSnap.size,
      workspaceAccounts,
      totalArticles,
      draftArticles,
      reworkedArticles,
      validatedArticles,
      averageCompletionPercent:
        usersSnap.size > 0 ? Math.round(completionSum / usersSnap.size) : 0,
    },
    connections,
    users: userRows,
  };
}
