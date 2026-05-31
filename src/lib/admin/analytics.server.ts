import type { Firestore, DocumentData } from "firebase-admin/firestore";
import { dateKeyFromDate, monthKeyFromDate, userLoginStatsRef, yearKeyFromDate } from "./record-login-event.server";

export type ConnectionGranularity = "day" | "week" | "month" | "year";

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
    Boolean(String(data.roleTitle ?? "").trim()) &&
    Boolean(String(data.positioningLine ?? "").trim()) &&
    Boolean(data.contentLanguage)
  );
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

function yearlyUsersCollection(db: Firestore, yearKey: string) {
  return db.collection("analytics").doc("yearly").collection(yearKey);
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

async function countUniqueUsersForYear(db: Firestore, yearKey: string): Promise<number> {
  const snap = await yearlyUsersCollection(db, yearKey).get();
  return snap.size;
}

export async function loadConnectionBuckets(
  db: Firestore,
  granularity: ConnectionGranularity,
): Promise<ConnectionBucket[]> {
  const today = new Date();

  if (granularity === "day") {
    const buckets: ConnectionBucket[] = [];
    for (let i = 29; i >= 0; i -= 1) {
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

  if (granularity === "week") {
    const buckets: ConnectionBucket[] = [];
    let weekStart = startOfUtcWeek(today);
    for (let w = 11; w >= 0; w -= 1) {
      const start = addDays(weekStart, w * -7);
      const end = addDays(start, 6);
      const union = new Set<string>();
      const daySets = await Promise.all(
        Array.from({ length: 7 }, (_, d) => uniqueUsersForDay(db, dateKeyFromDate(addDays(start, d)))),
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

  if (granularity === "month") {
    const buckets: ConnectionBucket[] = [];
    for (let i = 11; i >= 0; i -= 1) {
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

  const buckets: ConnectionBucket[] = [];
  for (let i = 4; i >= 0; i -= 1) {
    const year = today.getUTCFullYear() - i;
    const key = yearKeyFromDate(new Date(Date.UTC(year, 0, 1)));
    const uniqueUsers = await countUniqueUsersForYear(db, key);
    buckets.push({
      label: key,
      shortLabel: key,
      uniqueUsers,
    });
  }
  return buckets;
}

type WorkspaceArticleStats = {
  total: number;
  drafts: number;
  reworked: number;
  validated: number;
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
  userId: string,
  accountId?: string,
): Promise<{
  completionPercent: number;
  linkedinUrl: string | null;
  articles: WorkspaceArticleStats;
}> {
  const base = accountId
    ? `users/${userId}/accounts/${accountId}`
    : `users/${userId}`;

  const [llm, authorScoped, audienceScoped, personaScoped, articles] = await Promise.all([
    readDoc(db, `users/${userId}/llm/profile`),
    readDoc(db, `${base}/author/profile`),
    readDoc(db, `${base}/audience/profile`),
    readDoc(db, `${base}/persona/current`),
    listArticles(db, base),
  ]);

  const author =
    authorScoped ??
    (accountId ? undefined : await readDoc(db, `users/${userId}/author/profile`));
  const audience =
    audienceScoped ??
    (accountId ? undefined : await readDoc(db, `users/${userId}/audience/profile`));
  const persona =
    personaScoped ??
    (accountId ? undefined : await readDoc(db, `users/${userId}/persona/current`));

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
  const [usersSnap, day, week, month, year] = await Promise.all([
    db.collection("users").get(),
    loadConnectionBuckets(db, "day"),
    loadConnectionBuckets(db, "week"),
    loadConnectionBuckets(db, "month"),
    loadConnectionBuckets(db, "year"),
  ]);

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
    const displayName = userData.displayName
      ? String(userData.displayName)
      : null;

    const accountsSnap = await db.collection(`users/${userId}/accounts`).get();
    const accountIds = accountsSnap.docs.map((d) => d.id);
    const workspaces =
      accountIds.length > 0 ? accountIds : [undefined as string | undefined];

    workspaceAccounts += workspaces.length;

    let userDrafts = 0;
    let userReworked = 0;
    let userValidated = 0;
    let userTotal = 0;
    let userCompletionSum = 0;
    let linkedinUrl: string | null = null;

    for (const accountId of workspaces) {
      const stats = await getWorkspaceStats(db, userId, accountId);
      userDrafts += stats.articles.drafts;
      userReworked += stats.articles.reworked;
      userValidated += stats.articles.validated;
      userTotal += stats.articles.total;
      userCompletionSum += stats.completionPercent;
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
    connections: { day, week, month, year },
    users: userRows,
  };
}
