import { resolveContentNicheFromSteering } from "@/lib/articles/content-niche";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { chatCompletionJson, CREATOR_RADAR_CHAT_OPTIONS, mergeUsageLog } from "@/lib/llm/chat";
import type { LlmConfig } from "@/lib/llm/config";
import { getAllPlatformLlmConfigs } from "@/lib/llm/resolve-content-route-llm";
import { isInvalidApiKeyError } from "@/lib/llm/provider-errors";
import { parseLlmJson } from "@/lib/llm/parse-json";
import { buildNewsProfileContext } from "@/lib/news/profile-context";
import {
  buildCreatorRadarSystemPrompt,
  buildCreatorRadarUserPrompt,
} from "@/lib/prompts/creator-radar-suggestions";
import type { AuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import {
  CREATOR_RADAR_COUNT,
  normalizeCreatorRadarSuggestions,
} from "@/lib/creator-radar/normalize";
import { normalizeLinkedInProfileUrl } from "@/lib/creator-radar/urls";
import type { CreatorRadarSuggestion } from "@/types/creator-radar";
import type { ResolvedWorkspaceScope } from "@/lib/workspace/resolve-workspace-scope.server";
import {
  listWorkspaceCollectionDocs,
  workspaceScopedDocPath,
} from "@/lib/workspace/workspace-read.server";
import type { ContentLanguage } from "@/types/workspace";
import { FieldValue } from "firebase-admin/firestore";

const DISMISS_DAYS = 30;

export function creatorRadarDateKeyUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

type DismissEntry = {
  url: string;
  dismissedAt: string;
};

function isDismissActive(entry: DismissEntry, now = new Date()): boolean {
  const dismissed = Date.parse(entry.dismissedAt);
  if (Number.isNaN(dismissed)) return false;
  const ageMs = now.getTime() - dismissed;
  return ageMs >= 0 && ageMs <= DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export async function getDismissedLinkedInUrls(
  scope: ResolvedWorkspaceScope,
): Promise<string[]> {
  const db = getAdminFirestore();
  if (!db) return [];
  const snap = await db.doc(workspaceScopedDocPath(scope, "creatorRadarPrefs", "prefs")).get();
  if (!snap.exists) return [];
  const raw = snap.data()?.dismissed;
  if (!Array.isArray(raw)) return [];
  const now = new Date();
  return raw
    .filter((e): e is DismissEntry => e && typeof e === "object" && typeof e.url === "string")
    .filter((e) => isDismissActive(e, now))
    .map((e) => normalizeLinkedInProfileUrl(e.url));
}

export async function dismissCreatorRadarUrl(
  scope: ResolvedWorkspaceScope,
  linkedinUrl: string,
): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;
  const normalized = normalizeLinkedInProfileUrl(linkedinUrl);
  const ref = db.doc(workspaceScopedDocPath(scope, "creatorRadarPrefs", "prefs"));
  const snap = await ref.get();
  const existing = snap.exists ? (snap.data()?.dismissed as DismissEntry[] | undefined) : [];
  const list = Array.isArray(existing) ? existing : [];
  const nowIso = new Date().toISOString();
  const without = list.filter((e) => normalizeLinkedInProfileUrl(e.url) !== normalized);
  await ref.set(
    {
      dismissed: [...without, { url: normalized, dismissedAt: nowIso }],
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function listSavedInspirationProfileUrls(
  scope: ResolvedWorkspaceScope,
): Promise<string[]> {
  const db = getAdminFirestore();
  if (!db) return [];
  const docs = await listWorkspaceCollectionDocs(db, scope, "sources");
  return docs
    .map((d) => d.data)
    .filter((d) => d.category === "inspiration_profile" && typeof d.url === "string")
    .map((d) => normalizeLinkedInProfileUrl(d.url as string));
}

async function loadDailyRadar(
  scope: ResolvedWorkspaceScope,
  dateKey: string,
): Promise<CreatorRadarSuggestion[] | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  const snap = await db.doc(workspaceScopedDocPath(scope, "creatorRadarDaily", dateKey)).get();
  if (!snap.exists) return null;
  const creators = snap.data()?.creators;
  if (!Array.isArray(creators)) return null;
  return creators as CreatorRadarSuggestion[];
}

async function saveDailyRadar(
  scope: ResolvedWorkspaceScope,
  dateKey: string,
  creators: CreatorRadarSuggestion[],
): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;
  await db.doc(workspaceScopedDocPath(scope, "creatorRadarDaily", dateKey)).set({
    dateKey,
    creators,
    generatedAt: FieldValue.serverTimestamp(),
  });
}

function filterCreators(
  creators: CreatorRadarSuggestion[],
  exclude: Set<string>,
): CreatorRadarSuggestion[] {
  return creators.filter((c) => !exclude.has(normalizeLinkedInProfileUrl(c.linkedinUrl)));
}

export type CreatorRadarFetchInput = {
  actorUserId: string;
  workspace: ResolvedWorkspaceScope;
  contentLanguage: ContentLanguage;
  personaExcerpt?: string;
  authorSteering?: AuthorSteeringPayload | null;
  newsInterestQuery?: string;
  llmConfig: LlmConfig;
  llmByokFallback?: LlmConfig | null;
};

export type CreatorRadarResult = {
  creators: CreatorRadarSuggestion[];
  dateKey: string;
  cached: boolean;
};

export async function getOrCreateDailyCreatorRadar(
  input: CreatorRadarFetchInput,
): Promise<CreatorRadarResult> {
  const dateKey = creatorRadarDateKeyUtc();
  const [cached, dismissed, savedProfiles] = await Promise.all([
    loadDailyRadar(input.workspace, dateKey),
    getDismissedLinkedInUrls(input.workspace),
    listSavedInspirationProfileUrls(input.workspace),
  ]);

  const exclude = new Set([...dismissed, ...savedProfiles]);

  if (cached && cached.length > 0) {
    const visible = filterCreators(cached, exclude);
    return { creators: visible, dateKey, cached: true };
  }

  const llm = input.llmConfig;
  const personaExcerpt = input.personaExcerpt?.trim() ?? "";
  const profileContext = buildNewsProfileContext({
    author: (input.authorSteering?.author ?? null) as Parameters<
      typeof buildNewsProfileContext
    >[0]["author"],
    audience: input.authorSteering?.audience ?? null,
    profileEnrichment: input.authorSteering?.profileEnrichment,
    personaExcerpt,
    newsInterestQuery: input.newsInterestQuery,
    authorSteering: input.authorSteering,
  });

  const contentNiche = resolveContentNicheFromSteering(personaExcerpt, input.authorSteering);

  const messages = [
    { role: "system" as const, content: buildCreatorRadarSystemPrompt(input.contentLanguage) },
    {
      role: "user" as const,
      content: buildCreatorRadarUserPrompt(profileContext, contentNiche, [...exclude]),
    },
  ];
  const chatOptions = mergeUsageLog(
    input.actorUserId,
    "creator-radar/suggestions",
    CREATOR_RADAR_CHAT_OPTIONS,
  );

  const raw = await chatCreatorRadarWithPlatformFallback(
    llm,
    messages,
    chatOptions,
    input.llmByokFallback,
  );

  const parsed = parseLlmJson<{ creators?: unknown }>(raw);
  const { creators, rawCount } = normalizeCreatorRadarSuggestions(parsed);

  if (creators.length === 0) {
    throw new Error(rawCount === 0 ? "no_llm_results" : "no_valid_creators");
  }

  const toStore = creators.slice(0, CREATOR_RADAR_COUNT);
  await saveDailyRadar(input.workspace, dateKey, toStore);

  return {
    creators: filterCreators(toStore, exclude),
    dateKey,
    cached: false,
  };
}

async function chatCreatorRadarWithPlatformFallback(
  primary: LlmConfig,
  messages: { role: "system" | "user"; content: string }[],
  options: Parameters<typeof chatCompletionJson>[2],
  byokFallback?: LlmConfig | null,
): Promise<string> {
  const candidates: LlmConfig[] = [];
  const seen = new Set<string>();
  const add = (config: LlmConfig) => {
    const id = `${config.provider}:${config.apiKey}`;
    if (seen.has(id)) return;
    seen.add(id);
    candidates.push(config);
  };

  add(primary);
  for (const alt of getAllPlatformLlmConfigs()) add(alt);
  if (byokFallback) add(byokFallback);

  let lastError: unknown;
  for (const config of candidates) {
    try {
      return await chatCompletionJson(config, messages, options);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : "";
      if (!isInvalidApiKeyError(message)) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("llm_request_failed");
}
