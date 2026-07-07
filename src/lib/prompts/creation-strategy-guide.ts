import { buildLinkedIn2026SystemRules } from "@/lib/prompts/linkedin-2026-rules";
import {
 injectAuthorSteering,
 type AuthorSteeringPayload,
} from "@/lib/profile/author-steering-context";
import type { LinkedInActivityPostLlm } from "@/lib/prompts/linkedin-activity-fetch";
import type {
 ArticleCreationMode,
 ContentLanguage,
 CreationStrategyGuide,
 CreationStrategyTheme,
} from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
 fr: "French",
 en: "English",
 es: "Spanish",
};

export function buildCreationStrategyGuideSystemPrompt(
 contentLanguage: ContentLanguage,
): string {
 const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";

 return `You are a LinkedIn B2B content strategist for Ultra Content Maker.
${buildLinkedIn2026SystemRules(contentLanguage)}

The product offers three creation paths:
- profile: publish from Persona + structured brief (expertise, proof, POV)
- news: react to recent news (<7 days) with author angle + source in 1st comment
- inspiration: repurpose existing content (URL/paste/library) with a distinct angle

Return JSON only (${lang} for all user-facing strings):
{
 "postsAnalyzed": number,
 "periodLabel": "human-readable period e.g. last 2 months",
 "patternSummary": "2-4 sentences on formats, topics, tone, gaps",
 "recommendedMode": "profile" | "news" | "inspiration",
 "modeJustification": "2-3 sentences why this path NOW",
 "themes": [
 {
 "title": "short theme label",
 "angle": "1-2 sentences: proposed post angle",
 "rationale": "why this theme strategically (coherence, correction, pivot, or news timing)",
 "relationToHistory": "continuity" | "correction" | "pivot" | "news",
 "suggestedMode": "profile" | "news" | "inspiration",
 "newsHook": "optional · only if relationToHistory is news"
 }
 ]
}

Rules:
- Exactly 3 themes in themes array (one per creation path: profile, news, inspiration).
- At least 1 theme must relate to continuity or correction (anchor in past posts).
- Up to 1 theme may use relationToHistory "news" when timely news clearly strengthens the angle; set newsHook briefly.
- recommendedMode must match the strongest immediate recommendation.
- suggestedMode per theme can differ (e.g. one news theme, three profile themes).
- Be specific to THIS author · no generic "leadership tips".
- If few or no posts were found, recommend profile mode and themes that establish positioning from Persona.
- When userSteering is provided, treat it as the author's explicit priority: reshape all 3 themes and mode recommendation around that angle, keywords, or leads · while staying coherent with Persona and post history (or justify a deliberate pivot).`;
}

export function buildCreationStrategyGuideUserPrompt(input: {
 contentLanguage: ContentLanguage;
 activityUrl: string;
 personaExcerpt: string;
 authorContext?: {
 roleTitle?: string;
 positioningLine?: string;
 audienceFocus?: string;
 };
 posts: LinkedInActivityPostLlm[];
 userSteering?: string;
 authorSteering?: AuthorSteeringPayload | null;
}): string {
 const steering = input.userSteering?.trim().slice(0, 1500);
 const base = {
 activityUrl: input.activityUrl,
 personaExcerpt: input.personaExcerpt.slice(0, 6000),
 author: input.authorContext ?? null,
 userSteering: steering || null,
 recentPosts: input.posts,
 };
 const merged =
 input.authorSteering != null
 ? injectAuthorSteering(base, {
 ...input.authorSteering,
 author: {
 ...input.authorSteering.author,
 creationStrategySteering:
 steering ||
 input.authorSteering.author?.creationStrategySteering,
 },
 })
 : base;
 return JSON.stringify(merged, null, 2);
}

const MODES: ArticleCreationMode[] = ["profile", "news", "inspiration"];
const RELATIONS = ["continuity", "correction", "pivot", "news"] as const;

export function normalizeCreationStrategyGuide(raw: {
 postsAnalyzed?: unknown;
 periodLabel?: unknown;
 patternSummary?: unknown;
 recommendedMode?: unknown;
 modeJustification?: unknown;
 themes?: unknown;
}): CreationStrategyGuide | null {
 const recommendedMode = MODES.includes(raw.recommendedMode as ArticleCreationMode)
 ? (raw.recommendedMode as ArticleCreationMode)
 : "profile";

 const patternSummary = String(raw.patternSummary ?? "").trim();
 const modeJustification = String(raw.modeJustification ?? "").trim();
 if (!patternSummary || !modeJustification) return null;

 const themesRaw = Array.isArray(raw.themes) ? raw.themes : [];
 const themes: CreationStrategyTheme[] = [];

 for (const item of themesRaw) {
 if (!item || typeof item !== "object") continue;
 const t = item as Record<string, unknown>;
 const title = String(t.title ?? "").trim();
 const angle = String(t.angle ?? "").trim();
 const rationale = String(t.rationale ?? "").trim();
 if (!title || !angle || !rationale) continue;

 const relation = RELATIONS.includes(
 t.relationToHistory as (typeof RELATIONS)[number],
 )
 ? (t.relationToHistory as CreationStrategyTheme["relationToHistory"])
 : "continuity";

 const suggestedMode = MODES.includes(t.suggestedMode as ArticleCreationMode)
 ? (t.suggestedMode as ArticleCreationMode)
 : recommendedMode;

 themes.push({
 title,
 angle,
 rationale,
 relationToHistory: relation,
 suggestedMode,
 newsHook:
 relation === "news" && typeof t.newsHook === "string"
 ? t.newsHook.trim() || undefined
 : undefined,
 });
 if (themes.length >= 3) break;
 }

 if (themes.length < 3) return null;

 return {
 postsAnalyzed:
 typeof raw.postsAnalyzed === "number" && raw.postsAnalyzed >= 0
 ? raw.postsAnalyzed
 : 0,
 periodLabel: String(raw.periodLabel ?? "").trim() || "last 2 months",
 patternSummary,
 recommendedMode,
 modeJustification,
 themes,
 };
}
