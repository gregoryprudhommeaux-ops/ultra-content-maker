import type { Firestore, DocumentData } from "firebase-admin/firestore";
import { emptyCreationModeCounts, tallyCreationModes } from "@/lib/articles/infer-creation-mode";
import { usesPlatformLlmTier, buildSupportQuotaFields, computeSupportAccountMargin } from "@/lib/admin/admin-economics";
import { summarizeLlmUsage } from "@/lib/admin/llm-usage.server";
import {
  normalizeSubscriptionProfile,
  resolveSubscriptionAccess,
} from "@/lib/subscription/access";
import { isPlatformAdminIdentity } from "@/lib/workspace/platform-admin";
import { formatDisplayNameFromEmail } from "@/lib/workspace/display-name";
import { isValidUrl } from "@/lib/workspace/firestore-utils";
import { DEFAULT_ACCOUNT_ID } from "@/lib/workspace/workspace-scope";
import type { LinkedWorkspace, ArticleCreationMode, SupportProductionStatus } from "@/types/workspace";
import { dateKeyFromDate, monthKeyFromDate, userLoginStatsRef } from "./record-login-event.server";
import {
 CONNECTION_PERIOD_KEYS,
 type AdminAnalyticsPayload,
 type AdminUserMetrics,
 type AdminWorkspaceMetrics,
 type ConnectionBucket,
 type ConnectionGranularity,
 type SupportAccountRow,
 type SupportProductionCounts,
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
 Boolean(data.contentLanguage)
 );
}

function emptyProductionCounts(): SupportProductionCounts {
 return { to_produce: 0, client_review: 0, published: 0 };
}

function mergeProductionCounts(
 a: SupportProductionCounts,
 b: SupportProductionCounts,
): SupportProductionCounts {
 return {
 to_produce: a.to_produce + b.to_produce,
 client_review: a.client_review + b.client_review,
 published: a.published + b.published,
 };
}

function resolveProductionStatus(data: DocumentData): SupportProductionStatus {
 const raw = data.productionStatus as SupportProductionStatus | undefined;
 if (raw === "client_review" || raw === "published") return raw;
 return "to_produce";
}

function isInCurrentMonth(isoDate: string | null, monthKey: string): boolean {
 if (!isoDate) return false;
 return monthKeyFromDate(new Date(isoDate)) === monthKey;
}

type WorkspaceArticleTally = WorkspaceArticleStats & {
 validatedThisMonth: number;
 productionCounts: SupportProductionCounts;
 productionThisMonth: SupportProductionCounts;
};

function tallyArticlesWithProduction(
 docs: DocumentData[],
 monthKey: string,
): WorkspaceArticleTally {
 const base = tallyArticles(docs);
 const productionCounts = emptyProductionCounts();
 const productionThisMonth = emptyProductionCounts();
 let validatedThisMonth = 0;

 for (const data of docs) {
 const productionStatus = resolveProductionStatus(data);
 productionCounts[productionStatus] += 1;

 const updatedAt = toIsoDate(data.updatedAt);
 if (isInCurrentMonth(updatedAt, monthKey)) {
 productionThisMonth[productionStatus] += 1;
 }

 if (data.status === "validated") {
 const validatedAt = toIsoDate(data.validatedAt) ?? updatedAt;
 if (isInCurrentMonth(validatedAt, monthKey)) {
 validatedThisMonth += 1;
 }
 }
 }

 return {
 ...base,
 validatedThisMonth,
 productionCounts,
 productionThisMonth,
 };
}

type LinkedClientInfo = {
 uid: string;
 email: string;
 displayName: string | null;
};

type WorkspaceTarget = {
 ownerId: string;
 accountId?: string;
};

/** Where profile/articles live for this auth user (owner account vs invited client). */
function resolveMetricsDisplayName(
 userId: string,
 email: string,
 userData: DocumentData,
): string | null {
 const linked = userData.linkedWorkspace as LinkedWorkspace | undefined;
 if (isPlatformAdminIdentity({ uid: userId, email })) {
  return formatDisplayNameFromEmail(email) ?? (userData.displayName ? String(userData.displayName) : null);
 }
 if (userData.displayName) return String(userData.displayName);
 if (linked?.accountName) return String(linked.accountName);
 return formatDisplayNameFromEmail(email);
}

function filterOwnedAccountIdsForMetrics(
 userId: string,
 email: string,
 ownedAccountIds: string[],
): string[] {
 if (!isPlatformAdminIdentity({ uid: userId, email })) return ownedAccountIds;
 const defaultOnly = ownedAccountIds.filter((id) => id === DEFAULT_ACCOUNT_ID);
 return defaultOnly.length > 0 ? defaultOnly : [DEFAULT_ACCOUNT_ID];
}

function resolveWorkspaceTargets(
 userId: string,
 userData: DocumentData,
 ownedAccountIds: string[],
 email = "",
): WorkspaceTarget[] {
 const linked = userData.linkedWorkspace as LinkedWorkspace | undefined;
 // Invited clients only — owners keep their owned accounts even if linkedWorkspace is set.
 if (linked?.ownerId && linked.accountId && linked.ownerId !== userId) {
 return [{ ownerId: linked.ownerId, accountId: linked.accountId }];
 }
 const scopedAccountIds = filterOwnedAccountIdsForMetrics(userId, email, ownedAccountIds);
 if (scopedAccountIds.length > 0) {
 return scopedAccountIds.map((accountId) => ({ ownerId: userId, accountId }));
 }
 return [{ ownerId: userId }];
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

async function uniqueUsersForDay(db: Firestore, dateKey: string): Promise<string[]> {
 const snap = await dailyUsersCollection(db, dateKey).get();
 return snap.docs.map((d) => d.id);
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
 const dayIndexes = Array.from({ length: dayCount }, (_, i) => dayCount - 1 - i);
 return Promise.all(
 dayIndexes.map(async (offset) => {
 const date = addDays(today, -offset);
 const key = dateKeyFromDate(date);
 const userIds = await uniqueUsersForDay(db, key);
 return {
 label: key,
 shortLabel: `${pad2(date.getUTCDate())}/${pad2(date.getUTCMonth() + 1)}`,
 uniqueUsers: userIds.length,
 userIds,
 };
 }),
 );
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
 const userIds = [...union];
 buckets.push({
 label: `${dateKeyFromDate(start)} → ${dateKeyFromDate(end)}`,
 shortLabel: `S${pad2(start.getUTCDate())}/${pad2(start.getUTCMonth() + 1)}`,
 uniqueUsers: userIds.length,
 userIds,
 });
 }
 return buckets;
}

async function loadMonthlyBuckets(
 db: Firestore,
 monthCount: number,
): Promise<ConnectionBucket[]> {
 const today = new Date();
 const monthIndexes = Array.from({ length: monthCount }, (_, i) => monthCount - 1 - i);
 return Promise.all(
 monthIndexes.map(async (offset) => {
 const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - offset, 1));
 const key = monthKeyFromDate(date);
 const snap = await monthlyUsersCollection(db, key).get();
 const userIds = snap.docs.map((d) => d.id);
 return {
 label: key,
 shortLabel: `${pad2(date.getUTCMonth() + 1)}/${String(date.getUTCFullYear()).slice(-2)}`,
 uniqueUsers: userIds.length,
 userIds,
 };
 }),
 );
}

export async function loadConnectionBucketsForPeriods(
 db: Firestore,
 periods: ConnectionGranularity[],
): Promise<Partial<Record<ConnectionGranularity, ConnectionBucket[]>>> {
 const uniquePeriods = [...new Set(periods)];
 const entries = await Promise.all(
 uniquePeriods.map(async (period) => [period, await loadConnectionBuckets(db, period)] as const),
 );
 return Object.fromEntries(entries);
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

type OnboardingStepFlags = AdminUserMetrics["onboardingSteps"];

function emptyOnboardingSteps(): OnboardingStepFlags {
 return {
 llm: false,
 author: false,
 audience: false,
 persona: false,
 firstArticle: false,
 firstValidated: false,
 };
}

function mergeOnboardingSteps(
 a: OnboardingStepFlags,
 b: OnboardingStepFlags,
): OnboardingStepFlags {
 return {
 llm: a.llm || b.llm,
 author: a.author || b.author,
 audience: a.audience || b.audience,
 persona: a.persona || b.persona,
 firstArticle: a.firstArticle || b.firstArticle,
 firstValidated: a.firstValidated || b.firstValidated,
 };
}

function completionPercentFromOnboardingSteps(steps: OnboardingStepFlags): number {
 const checklist = [
 steps.llm,
 steps.author,
 steps.audience,
 steps.persona,
 steps.firstArticle,
 ];
 return Math.round((checklist.filter(Boolean).length / checklist.length) * 100);
}

function computeOnboardingStepFlags(
 llm: DocumentData | undefined,
 author: DocumentData | undefined,
 audience: DocumentData | undefined,
 persona: DocumentData | undefined,
 articleStats: WorkspaceArticleStats,
 options: { hasPlatformLlm: boolean; usesOwnerLlm: boolean },
): OnboardingStepFlags {
 const hasOwnKey = Boolean(String(llm?.apiKey ?? "").trim()) && llm?.userProvided !== false;
 return {
 llm: hasOwnKey || options.hasPlatformLlm || options.usesOwnerLlm,
 author: isAuthorComplete(author),
 audience: isAudienceComplete(audience),
 persona:
 persona?.status === "validated" || Boolean(String(persona?.promptText ?? "").trim()),
 firstArticle: articleStats.total > 0,
 firstValidated: articleStats.validated > 0,
 };
}

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

function workspacePathAllowsLegacyArticleFallback(basePath: string): boolean {
 if (!/^users\/[^/]+\/accounts\//.test(basePath)) return true;
 return basePath.endsWith(`/accounts/${DEFAULT_ACCOUNT_ID}`);
}

async function readWorkspaceProfileDoc(
 db: Firestore,
 workspaceOwnerId: string,
 accountId: string | undefined,
 ...segments: string[]
): Promise<DocumentData | undefined> {
 const base = accountId
 ? `users/${workspaceOwnerId}/accounts/${accountId}`
 : `users/${workspaceOwnerId}`;
 const scoped = await readDoc(db, `${base}/${segments.join("/")}`);
 if (scoped) return scoped;
 if (accountId && accountId !== DEFAULT_ACCOUNT_ID) return undefined;
 return readDoc(db, `users/${workspaceOwnerId}/${segments.join("/")}`);
}

async function listArticles(
 db: Firestore,
 basePath: string,
): Promise<DocumentData[]> {
 const scoped = await db.collection(`${basePath}/articles`).get();
 if (!scoped.empty) return scoped.docs.map((d) => d.data());
 if (!workspacePathAllowsLegacyArticleFallback(basePath)) return [];

 const legacyUserId = basePath.match(/^users\/([^/]+)/)?.[1];
 if (!legacyUserId) return [];
 const legacy = await db.collection(`users/${legacyUserId}/articles`).get();
 return legacy.docs.map((d) => d.data());
}

async function getWorkspaceStats(
 db: Firestore,
 llmUserId: string,
 workspaceOwnerId: string,
 accountId: string | undefined,
 options: { hasPlatformLlm: boolean; usesOwnerLlm: boolean },
 monthKey: string,
 llmProfile?: DocumentData,
): Promise<{
 completionPercent: number;
 linkedinUrl: string | null;
 articles: WorkspaceArticleTally;
 onboardingSteps: OnboardingStepFlags;
}> {
 const base = accountId
 ? `users/${workspaceOwnerId}/accounts/${accountId}`
 : `users/${workspaceOwnerId}`;

 const [llm, author, audience, persona, articles] = await Promise.all([
 llmProfile !== undefined
 ? Promise.resolve(llmProfile)
 : readDoc(db, `users/${llmUserId}/llm/profile`),
 readWorkspaceProfileDoc(db, workspaceOwnerId, accountId, "author", "profile"),
 readWorkspaceProfileDoc(db, workspaceOwnerId, accountId, "audience", "profile"),
 readWorkspaceProfileDoc(db, workspaceOwnerId, accountId, "persona", "current"),
 listArticles(db, base),
 ]);

 const articleStats = tallyArticlesWithProduction(articles, monthKey);
 const onboardingSteps = computeOnboardingStepFlags(
 llm,
 author,
 audience,
 persona,
 articleStats,
 options,
 );

 return {
 completionPercent: completionPercentFromOnboardingSteps(onboardingSteps),
 linkedinUrl: author?.linkedinProfileUrl
 ? String(author.linkedinProfileUrl)
 : null,
 articles: articleStats,
 onboardingSteps,
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

function isSupportTier(tier: AdminUserMetrics["effectiveTier"]): boolean {
 return tier === "support_starter" || tier === "support_regular" || tier === "support_total";
}

function buildSupportWorkspaceRow(
 ownerId: string,
 accountId: string | undefined,
 accountDoc: DocumentData | undefined,
 ownerEmail: string,
 ownerDisplayName: string | null,
 tier: AdminUserMetrics["effectiveTier"],
 stats: Awaited<ReturnType<typeof getWorkspaceStats>>,
 linkedClientByWorkspace: Map<string, LinkedClientInfo>,
): AdminWorkspaceMetrics {
 const accountName = accountId
 ? String(accountDoc?.name ?? accountId)
 : ownerDisplayName ?? ownerEmail;
 const clientKey = accountId ? `${ownerId}:${accountId}` : null;
 const linkedClient = clientKey ? linkedClientByWorkspace.get(clientKey) : undefined;

 return {
 ownerId,
 accountId: accountId ?? ownerId,
 accountName,
 ownerEmail,
 ownerDisplayName,
 tier,
 linkedClientUid: linkedClient?.uid ?? null,
 linkedClientEmail: linkedClient?.email ?? null,
 linkedClientDisplayName: linkedClient?.displayName ?? null,
 validatedTotal: stats.articles.validated,
 validatedThisMonth: stats.articles.validatedThisMonth,
 productionCounts: stats.articles.productionCounts,
 productionThisMonth: stats.articles.productionThisMonth,
 };
}

function sumLlmCostForUserIds(
 byUserId: Record<string, number>,
 userIds: string[],
): number {
 return userIds.reduce((sum, id) => sum + (byUserId[id] ?? 0), 0);
}

const USER_METRICS_CONCURRENCY = 8;

async function mapWithConcurrency<T, R>(
 items: T[],
 concurrency: number,
 fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
 if (items.length === 0) return [];
 const results = new Array<R>(items.length);
 let nextIndex = 0;

 async function worker(): Promise<void> {
 while (nextIndex < items.length) {
 const index = nextIndex;
 nextIndex += 1;
 results[index] = await fn(items[index]!, index);
 }
 }

 await Promise.all(
 Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
 );
 return results;
}

export type BuildAdminAnalyticsOptions = {
 /** Connection periods to load. Defaults to all periods (weekly digest / full refresh). */
 connectionPeriods?: ConnectionGranularity[];
 /** Reuse cached user metrics when available (admin overview). */
 useCache?: boolean;
};

export type AdminAnalyticsCore = Omit<AdminAnalyticsPayload, "connections">;

export async function buildAdminAnalyticsCore(
 db: Firestore,
 options: { useCache?: boolean } = {},
): Promise<AdminAnalyticsCore> {
 const { useCache = false } = options;
 if (useCache) {
 const { getCachedAnalyticsCore } = await import("@/lib/admin/analytics-cache.server");
 const cached = getCachedAnalyticsCore();
 if (cached) return cached;
 }

 const since = new Date();
 since.setUTCDate(since.getUTCDate() - 30);
 const monthKey = monthKeyFromDate(new Date());

 const [usersSnap, llmUsageFull] = await Promise.all([
 db.collection("users").get(),
 summarizeLlmUsage(db, since),
 ]);

 const linkedClientsByOwner = new Map<string, number>();
 const linkedClientByWorkspace = new Map<string, LinkedClientInfo>();
 const linkedClientUidsByOwner = new Map<string, string[]>();
 for (const userDoc of usersSnap.docs) {
 const userData = userDoc.data();
 const linked = userData.linkedWorkspace as LinkedWorkspace | undefined;
 const ownerId = linked?.ownerId?.trim();
 if (ownerId && linked?.accountId) {
 linkedClientsByOwner.set(ownerId, (linkedClientsByOwner.get(ownerId) ?? 0) + 1);
 const workspaceKey = `${ownerId}:${linked.accountId}`;
 linkedClientByWorkspace.set(workspaceKey, {
 uid: userDoc.id,
 email: String(userData.email ?? "").trim() || "-",
 displayName: userData.displayName ? String(userData.displayName) : null,
 });
 const clientUids = linkedClientUidsByOwner.get(ownerId) ?? [];
 clientUids.push(userDoc.id);
 linkedClientUidsByOwner.set(ownerId, clientUids);
 }

 const managedClients = userData.managedClients as
 | Array<{ clientUid?: string; accountId?: string; email?: string; displayName?: string }>
 | undefined;
 if (managedClients?.length) {
 for (const row of managedClients) {
 const clientUid = row.clientUid?.trim();
 const accountId = row.accountId?.trim() || DEFAULT_ACCOUNT_ID;
 if (!clientUid) continue;
 const workspaceKey = `${clientUid}:${accountId}`;
 if (!linkedClientByWorkspace.has(workspaceKey)) {
 linkedClientByWorkspace.set(workspaceKey, {
 uid: clientUid,
 email: String(row.email ?? "").trim() || "-",
 displayName: row.displayName ? String(row.displayName) : null,
 });
 }
 const clientUids = linkedClientUidsByOwner.get(userDoc.id) ?? [];
 if (!clientUids.includes(clientUid)) {
 clientUids.push(clientUid);
 linkedClientUidsByOwner.set(userDoc.id, clientUids);
 }
 linkedClientsByOwner.set(userDoc.id, (linkedClientsByOwner.get(userDoc.id) ?? 0) + 1);
 }
 }
 }

 const [accountSnaps, loginStatsList] = await Promise.all([
 Promise.all(
 usersSnap.docs.map((userDoc) => db.collection(`users/${userDoc.id}/accounts`).get()),
 ),
 Promise.all(usersSnap.docs.map((userDoc) => getUserLoginStats(db, userDoc.id))),
 ]);

 type UserBuildResult = {
 userRow: AdminUserMetrics;
 supportAccount: SupportAccountRow | null;
 supportWorkspaces: AdminWorkspaceMetrics[];
 workspaceCount: number;
 totals: {
 totalArticles: number;
 draftArticles: number;
 reworkedArticles: number;
 validatedArticles: number;
 completionPercent: number;
 };
 };

 const userBuildResults = await mapWithConcurrency(
 usersSnap.docs,
 USER_METRICS_CONCURRENCY,
 async (userDoc, index): Promise<UserBuildResult> => {
 const userId = userDoc.id;
 const userData = userDoc.data();
 const email = String(userData.email ?? "").trim() || "-";
 const linked = userData.linkedWorkspace as LinkedWorkspace | undefined;
 const displayName = resolveMetricsDisplayName(userId, email, userData);

 const accountIds = accountSnaps[index]!.docs.map((d) => d.id);
 const workspaces = resolveWorkspaceTargets(userId, userData, accountIds, email);

 let userDrafts = 0;
 let userReworked = 0;
 let userValidated = 0;
 let userTotal = 0;
 let userCompletionSum = 0;
 let linkedinUrl: string | null = null;
 const userModeCounts = emptyCreationModeCounts();

 const subscription = normalizeSubscriptionProfile(userData.subscription);
 const isPlatformAdmin =
 Boolean(userData.isPlatformAdmin) || isPlatformAdminIdentity({ uid: userId, email });
 const access = resolveSubscriptionAccess(subscription, {
 isPlatformAdmin,
 hasLinkedWorkspace: Boolean(linked?.ownerId),
 });
 const effectiveTier = access.effectiveTier;
 const usesPlatformLlm = usesPlatformLlmTier(effectiveTier, access.isExpired);
 const llmProfile = await readDoc(db, `users/${userId}/llm/profile`);
 const hasPlatformLlm =
 access.canUsePlatformLlm && !Boolean(String(llmProfile?.apiKey ?? "").trim());
 const usesOwnerLlm = Boolean(linked?.ownerId);
 const supportUser = isSupportTier(effectiveTier);

 let userOnboardingSteps = emptyOnboardingSteps();
 const supportWorkspaces: AdminWorkspaceMetrics[] = [];

 const workspaceStats = await Promise.all(
 workspaces.map(async ({ ownerId, accountId }) => {
 const stats = await getWorkspaceStats(
 db,
 userId,
 ownerId,
 accountId,
 { hasPlatformLlm, usesOwnerLlm },
 monthKey,
 llmProfile,
 );
 let accountDoc: DocumentData | undefined;
 if (supportUser && accountId) {
 accountDoc = await readDoc(db, `users/${ownerId}/accounts/${accountId}`);
 }
 return { ownerId, accountId, stats, accountDoc };
 }),
 );

 for (const { ownerId, accountId, stats, accountDoc } of workspaceStats) {
 userDrafts += stats.articles.drafts;
 userReworked += stats.articles.reworked;
 userValidated += stats.articles.validated;
 userTotal += stats.articles.total;
 userCompletionSum += stats.completionPercent;
 for (const mode of Object.keys(userModeCounts) as ArticleCreationMode[]) {
 userModeCounts[mode] += stats.articles.modeCounts[mode];
 }
 if (!linkedinUrl && stats.linkedinUrl) linkedinUrl = stats.linkedinUrl;
 userOnboardingSteps = mergeOnboardingSteps(userOnboardingSteps, stats.onboardingSteps);

 if (supportUser) {
 supportWorkspaces.push(
 buildSupportWorkspaceRow(
 ownerId,
 accountId,
 accountDoc,
 email,
 displayName,
 effectiveTier,
 stats,
 linkedClientByWorkspace,
 ),
 );
 }
 }

 const completionPercent =
 workspaces.length > 0 ? Math.round(userCompletionSum / workspaces.length) : 0;
 const loginStats = loginStatsList[index]!;
 const usageScore = userTotal + userReworked * 2 + loginStats.hits;

 const userRow: AdminUserMetrics = {
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
 subscriptionTier: subscription.tier,
 effectiveTier,
 isExpired: access.isExpired,
 isTrialActive: access.isTrialActive,
 postsRemaining: access.postsRemaining,
 blockReason: access.blockReason ?? null,
 isPlatformAdmin,
 excludeFromStatsDefault: isPlatformAdmin,
 usesPlatformLlm,
 onboardingSteps: userOnboardingSteps,
 activationMethod: subscription.activationMethod ?? null,
 hasStripeSubscription: Boolean(subscription.stripeSubscriptionId),
 managedByAdminUid:
  (userData.managedBy as { adminUid?: string } | undefined)?.adminUid?.trim() ?? null,
 };

 let supportAccount: SupportAccountRow | null = null;
 if (supportUser) {
 let deliveredThisMonth = 0;
 let accountProductionCounts = emptyProductionCounts();
 let accountProductionThisMonth = emptyProductionCounts();
 for (const ws of supportWorkspaces) {
 deliveredThisMonth += ws.validatedThisMonth;
 accountProductionCounts = mergeProductionCounts(
 accountProductionCounts,
 ws.productionCounts,
 );
 accountProductionThisMonth = mergeProductionCounts(
 accountProductionThisMonth,
 ws.productionThisMonth,
 );
 }

 const quotaFields = buildSupportQuotaFields(effectiveTier, deliveredThisMonth);
 const relatedUserIds = [userId, ...(linkedClientUidsByOwner.get(userId) ?? [])];
 const llmCostUsd = sumLlmCostForUserIds(llmUsageFull.byUserId, relatedUserIds);
 const margin = computeSupportAccountMargin({
 tier: effectiveTier,
 deliveredThisMonth,
 llmCostUsd,
 });

 supportAccount = {
 userId,
 email,
 displayName,
 tier: effectiveTier,
 ownedWorkspaces: supportWorkspaces.length,
 linkedClients: linkedClientsByOwner.get(userId) ?? 0,
 validatedPosts: userValidated,
 monthlyQuota: quotaFields.monthlyQuota,
 deliveredThisMonth,
 remainingQuota: quotaFields.remainingQuota,
 deliveryStatus: quotaFields.deliveryStatus,
 revenueUsd: margin.revenueUsd,
 llmCostUsd,
 humanCostUsd: margin.humanCostUsd,
 estimatedMarginUsd: margin.estimatedMarginUsd,
 productionCounts: accountProductionCounts,
 productionThisMonth: accountProductionThisMonth,
 workspaces: supportWorkspaces,
 postsRemaining: quotaFields.remainingQuota,
 };
 }

 return {
 userRow,
 supportAccount,
 supportWorkspaces,
 workspaceCount: workspaces.length,
 totals: {
 totalArticles: userTotal,
 draftArticles: userDrafts,
 reworkedArticles: userReworked,
 validatedArticles: userValidated,
 completionPercent,
 },
 };
 },
 );

 const userRows = userBuildResults.map((result) => result.userRow);
 userRows.sort((a, b) => b.usageScore - a.usageScore);

 const supportProductionTotals = emptyProductionCounts();
 const supportWorkspaceAccounts: AdminWorkspaceMetrics[] = [];
 const supportAccounts: SupportAccountRow[] = [];

 for (const result of userBuildResults) {
 if (result.supportAccount) {
 supportAccounts.push(result.supportAccount);
 supportWorkspaceAccounts.push(...result.supportWorkspaces);
 for (const ws of result.supportWorkspaces) {
 supportProductionTotals.to_produce += ws.productionThisMonth.to_produce;
 supportProductionTotals.client_review += ws.productionThisMonth.client_review;
 supportProductionTotals.published += ws.productionThisMonth.published;
 }
 }
 }

 const core: AdminAnalyticsCore = {
 generatedAt: new Date().toISOString(),
 totals: {
 registeredUsers: usersSnap.size,
 workspaceAccounts: userBuildResults.reduce((sum, result) => sum + result.workspaceCount, 0),
 totalArticles: userBuildResults.reduce((sum, result) => sum + result.totals.totalArticles, 0),
 draftArticles: userBuildResults.reduce((sum, result) => sum + result.totals.draftArticles, 0),
 reworkedArticles: userBuildResults.reduce(
 (sum, result) => sum + result.totals.reworkedArticles,
 0,
 ),
 validatedArticles: userBuildResults.reduce(
 (sum, result) => sum + result.totals.validatedArticles,
 0,
 ),
 averageCompletionPercent:
 usersSnap.size > 0
 ? Math.round(
 userBuildResults.reduce((sum, result) => sum + result.totals.completionPercent, 0) /
 usersSnap.size,
 )
 : 0,
 },
 users: userRows,
 supportAccounts,
 workspaceAccounts: supportWorkspaceAccounts,
 supportProductionTotals,
 llmUsage: {
 platformCalls: llmUsageFull.platformCalls,
 platformTokens: llmUsageFull.platformTokens,
 platformCostUsd: llmUsageFull.platformCostUsd,
 },
 };

 if (useCache) {
 const { setCachedAnalyticsCore } = await import("@/lib/admin/analytics-cache.server");
 setCachedAnalyticsCore(core);
 }

 return core;
}

export async function buildAdminAnalytics(
 db: Firestore,
 options: BuildAdminAnalyticsOptions = {},
): Promise<AdminAnalyticsPayload> {
 const connectionPeriods = options.connectionPeriods ?? CONNECTION_PERIOD_KEYS;
 const useCache = options.useCache ?? false;

 const core = await buildAdminAnalyticsCore(db, { useCache });

 const {
 getCachedConnectionPeriod,
 setCachedConnectionPeriod,
 } = await import("@/lib/admin/analytics-cache.server");

 const periodsToLoad = connectionPeriods.filter((period) => {
 if (!useCache) return true;
 return getCachedConnectionPeriod(period) == null;
 });

 const loadedConnections =
 periodsToLoad.length > 0
 ? await loadConnectionBucketsForPeriods(db, periodsToLoad)
 : {};

 for (const [period, buckets] of Object.entries(loadedConnections) as Array<
 [ConnectionGranularity, ConnectionBucket[]]
 >) {
 if (useCache) {
 setCachedConnectionPeriod(period, buckets);
 }
 }

 const connectionMap: Record<ConnectionGranularity, ConnectionBucket[]> = {
 day: [],
 week: [],
 month1: [],
 month3: [],
 month6: [],
 year1: [],
 all: [],
 };

 for (const period of connectionPeriods) {
 const buckets =
 loadedConnections[period] ?? (useCache ? getCachedConnectionPeriod(period) : null);
 if (buckets) {
 connectionMap[period] = buckets;
 }
 }

 return {
 ...core,
 connections: connectionMap,
 };
}
