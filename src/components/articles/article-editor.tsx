"use client";

import { ArticleFormatPanel } from "@/components/articles/article-format-panel";
import { ArticleDraftReviewLinkButton } from "@/components/admin/article-draft-review-link-button";
import { EditorBlockHeader } from "@/components/articles/editor-block-header";
import { EditorCollapsibleSection } from "@/components/articles/editor-collapsible-section";
import { EditorPanelPlaceholder } from "@/components/articles/editor-panel-placeholder";
import dynamic from "next/dynamic";
import {
 getReviseIntentPrompt,
 type ReviseIntent,
} from "@/lib/prompts/revise-intent-prompts";
import { primaryPostObjective } from "@/lib/articles/post-brief-objectives";
import { bodyContainsExternalLink } from "@/lib/linkedin/body-links";
import { EmojiLevelPicker } from "@/components/articles/emoji-level-picker";
import { ToneEdgePicker } from "@/components/articles/tone-edge-picker";
import { LinkedInCharCount } from "@/components/articles/linkedin-char-count";
import {
 ButtonSpinner,
 GeneratingIndicator,
} from "@/components/ui/generating-indicator";
import { ContextHelp } from "@/components/ui/context-help";
import { UserErrorBanner } from "@/components/ui/user-error-banner";
import { useAuth } from "@/components/auth/auth-provider";
import { useSubscription } from "@/contexts/subscription-context";
import { gatherAuthorSteeringPayload } from "@/lib/profile/gather-author-steering";
import { resolveContentArchetype } from "@/lib/persona/content-archetype";
import {
 parseEditorialPillars,
 parseOrganizationProfile,
 showsOrganizationProfileFields,
} from "@/lib/persona/organization-enrichment";
import {
 credibilityChecklistSummary,
 runCredibilityChecklist,
} from "@/lib/articles/credibility-checklist";
import { getPersona } from "@/lib/workspace/persona";
import { hasClientLlmAccess, llmPayloadForAccess } from "@/lib/llm/client-payload";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import {
 hasReviseInput,
 mergeRefinementWithDefaults,
} from "@/lib/articles/refinement";
import { copyAndOpenLinkedInComposer } from "@/lib/linkedin/composer";
import { formatHashtagsLine } from "@/lib/linkedin/hashtags";
import {
 fitLinkedInArticleParts,
 joinLinkedInPostParts,
 maxDraftCharsForArticle,
} from "@/lib/linkedin/fit-linkedin-post";
import { sanitizeCtaLinkUrl } from "@/lib/linkedin/sanitize-post-link";
import {
 buildExportText,
 getArticle,
 markArticleRegenerated,
 saveArticleIllustration,
 saveArticleQuality,
 saveArticleRefinement,
 saveArticleRepostSuggestions,
 saveArticleSlopAnalysis,
 updateArticleContent,
 validateArticleWithCta,
} from "@/lib/workspace/articles";
import { notifyArticlesChanged, notifyArticlesChangedDeferred } from "@/lib/workspace/articles-events";
import {
 persistArticleRefinementAndSyncPersona,
 recordArticleRefinementFeedback,
 recordArticleValidateFeedback,
} from "@/lib/persona/sync-persona-from-feedback";
import { getClientAuth } from "@/lib/firebase/client";
import { classifyLlmApiError, truncateApiDetail } from "@/lib/llm/format-api-error";
import { isInvalidApiKeyError } from "@/lib/llm/parse-json";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type {
 ArticleDoc,
 ArticleIllustration,
 ArticlePerformanceSignals,
 ArticleQualityScores,
 ArticleRefinement,
 ArticleScope,
 CtaIntensity,
 CtaSuggestion,
 EmojiLevel,
 EditorialPillar,
 OrganizationProfile,
 RefinementAnswer,
 RepostSuggestion,
 ToneEdge,
} from "@/types/workspace";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import { ImeSafeInput, ImeSafeTextarea } from "@/components/ui/ime-safe-field";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const ArticleQualityPanelLazy = dynamic(
 () =>
 import("@/components/articles/article-quality-panel").then((m) => m.ArticleQualityPanel),
 { loading: () => <EditorPanelPlaceholder lines={4} /> },
);

const ArticleSlopPanelLazy = dynamic(
 () => import("@/components/articles/article-slop-panel").then((m) => m.ArticleSlopPanel),
 { loading: () => <EditorPanelPlaceholder lines={3} /> },
);

const ArticleFormatPanelLazy = dynamic(
 () => import("@/components/articles/article-format-panel").then((m) => m.ArticleFormatPanel),
 { loading: () => <EditorPanelPlaceholder lines={5} /> },
);

const ArticleShareActionsLazy = dynamic(
 () => import("@/components/articles/article-share-actions").then((m) => m.ArticleShareActions),
 { loading: () => <EditorPanelPlaceholder lines={2} /> },
);

const ArticleIllustrationPanelLazy = dynamic(
 () =>
 import("@/components/articles/article-illustration-panel").then(
 (m) => m.ArticleIllustrationPanel,
 ),
 { loading: () => <EditorPanelPlaceholder lines={3} /> },
);

const ArticleRepostPanelLazy = dynamic(
 () => import("@/components/articles/article-repost-panel").then((m) => m.ArticleRepostPanel),
 { loading: () => <EditorPanelPlaceholder lines={3} /> },
);

const ArticleDeliveryPackPanelLazy = dynamic(
 () =>
 import("@/components/articles/article-delivery-pack-panel").then(
 (m) => m.ArticleDeliveryPackPanel,
 ),
 { loading: () => <EditorPanelPlaceholder lines={4} /> },
);

const ArticleCredibilityChecklistLazy = dynamic(
 () =>
 import("@/components/articles/article-credibility-checklist").then(
 (m) => m.ArticleCredibilityChecklist,
 ),
 { loading: () => <EditorPanelPlaceholder lines={2} /> },
);

const ArticlePerformancePanelLazy = dynamic(
 () =>
 import("@/components/articles/article-performance-panel").then(
 (m) => m.ArticlePerformancePanel,
 ),
 { loading: () => <EditorPanelPlaceholder lines={2} /> },
);

type Props = {
 articleId: string;
 /** In wizard: hide nav/extra panels; show draft + refine + CTA inline. */
 variant?: "page" | "wizard";
};

export function ArticleEditor({ articleId, variant = "page" }: Props) {
 const isWizard = variant === "wizard";
 const t = useTranslations("setup.articles.detail");
 const tArticles = useTranslations("setup.articles");
 const tRef = useTranslations("setup.articles.refinement");
 const tCta = useTranslations("setup.articles.cta");
 const tDetailHelp = useTranslations("setup.articles.detail.help");
 const tIll = useTranslations("setup.articles.illustration");
 const tRepost = useTranslations("setup.articles.repost");
 const tCred = useTranslations("setup.articles.credibilityChecklist");
 const tQuality = useTranslations("setup.articles.quality");
 const { user, loading: authLoading } = useAuth();
 const { access: subscriptionAccess, refresh: refreshSubscription } = useSubscription();
 const [article, setArticle] = useState<ArticleDoc | null>(null);
 const [personaText, setPersonaText] = useState("");
 const [ctaSuggestions, setCtaSuggestions] = useState<CtaSuggestion[]>([]);
 const [selectedCtaStyle, setSelectedCtaStyle] = useState<CtaIntensity | null>(
 null,
 );
 const [ctaLoading, setCtaLoading] = useState(false);
 const [illustration, setIllustration] = useState<ArticleIllustration | null>(null);
 const [illustrationLoading, setIllustrationLoading] = useState(false);
 const [repostSuggestions, setRepostSuggestions] = useState<RepostSuggestion[] | null>(null);
 const [repostExpectedTeamCount, setRepostExpectedTeamCount] = useState<number | undefined>(
 undefined,
 );
 const [repostLoading, setRepostLoading] = useState(false);
 const [organizationProfile, setOrganizationProfile] = useState<OrganizationProfile | null>(
 null,
 );
 const [editorialPillars, setEditorialPillars] = useState<EditorialPillar[]>([]);
 const [showOrgMode, setShowOrgMode] = useState(false);
 const [pendingAction, setPendingAction] = useState<"revise" | "validate" | null>(
 null,
 );
 const [error, setError] = useState<string | null>(null);
 const [errorDetail, setErrorDetail] = useState<string | null>(null);
 const [errorApiCode, setErrorApiCode] = useState<string | undefined>();
 const [errorApiRawDetail, setErrorApiRawDetail] = useState<string | undefined>();
 const [errorScope, setErrorScope] = useState<"refine" | "cta" | null>(null);
 const [copied, setCopied] = useState(false);
 const [loaded, setLoaded] = useState(false);
 const [qualityLoading, setQualityLoading] = useState(false);
 const [qualityScores, setQualityScores] = useState<ArticleQualityScores | null>(
 null,
 );
 const [alternativeHooks, setAlternativeHooks] = useState<string[]>([]);
 const [qualityCritique, setQualityCritique] = useState<string | null>(null);
 const [showValidationNudge, setShowValidationNudge] = useState(false);

 const loadCtaSuggestions = useCallback(async () => {
 if (!user || !article || !personaText) return;
 setCtaLoading(true);
 setError(null);
 try {
 const auth = getClientAuth();
 const token = auth ? await auth.currentUser?.getIdToken() : null;
 const [authorSteering, llmProfile] = await Promise.all([
 gatherAuthorSteeringPayload(user.uid),
 getUserLlmProfile(user.uid),
 ]);
 const llmPayload = llmPayloadForAccess(llmProfile, subscriptionAccess);
 if (!token || !hasClientLlmAccess(subscriptionAccess, llmPayload)) return;

 const res = await fetch("/api/articles/cta-suggestions", {
 method: "POST",
 headers: {
 Authorization: `Bearer ${token}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 personaPromptText: personaText,
 contentLanguage: article.contentLanguage,
 hook: article.hook,
 body: article.body,
 ps: article.ps,
 authorSteering,
 postObjective: article.postBrief
 ? primaryPostObjective(article.postBrief)
 : "credibility",
 llm: llmPayload,
 }),
 });
 const data = await res.json();
 if (!res.ok) {
 setError(tCta("loadFailed"));
 return;
 }
 const list = data.suggestions ?? [];
 setCtaSuggestions(list);
 setSelectedCtaStyle((prev) => {
 if (prev) return prev;
 return (
 list.find((s: CtaSuggestion) => s.style === "medium")?.style ??
 list[0]?.style ??
 null
 );
 });
 } catch {
 setError(tCta("loadFailed"));
 } finally {
 setCtaLoading(false);
 }
 }, [user, article, personaText, subscriptionAccess, tCta]);

 const loadIllustrationSuggestions = useCallback(
 async (force = false, opts?: { quiet?: boolean }) => {
 if (!user || !article) return;
 if (!force && article.illustration) {
 setIllustration(article.illustration);
 return;
 }
 setIllustrationLoading(true);
 if (!opts?.quiet) setError(null);
 try {
 const auth = getClientAuth();
 const token = auth ? await auth.currentUser?.getIdToken() : null;
 const llmProfile = await getUserLlmProfile(user.uid);
 const llmPayload = llmPayloadForAccess(llmProfile, subscriptionAccess);
 if (!token || !hasClientLlmAccess(subscriptionAccess, llmPayload)) return;

 const res = await fetch("/api/articles/illustration-suggestions", {
 method: "POST",
 headers: {
 Authorization: `Bearer ${token}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 contentLanguage: article.contentLanguage,
 hook: article.hook,
 body: article.body,
 ps: article.ps,
 scope: article.scope,
 llm: llmPayload,
 }),
 });
 const data = await res.json();
 if (!res.ok || !data.illustration) {
 if (!opts?.quiet) setError(tIll("loadFailed"));
 return;
 }
 await saveArticleIllustration(user.uid, article.id, data.illustration);
 setIllustration(data.illustration);
 setArticle((prev) =>
 prev ? { ...prev, illustration: data.illustration } : prev,
 );
 } catch {
 if (!opts?.quiet) setError(tIll("loadFailed"));
 } finally {
 setIllustrationLoading(false);
 }
 },
 [user, article, subscriptionAccess, tIll],
 );

 const loadRepostSuggestions = useCallback(
 async (force = false, opts?: { quiet?: boolean }) => {
 if (!user || !article || !showOrgMode) return;
 if (!force && article.repostSuggestions?.length) {
 setRepostSuggestions(article.repostSuggestions);
 return;
 }
 const org = organizationProfile ?? parseOrganizationProfile(null);
 if (!(org.teamMembers?.length ?? 0)) return;

 setRepostLoading(true);
 if (!opts?.quiet) setError(null);
 try {
 const auth = getClientAuth();
 const token = auth ? await auth.currentUser?.getIdToken() : null;
 const llmProfile = await getUserLlmProfile(user.uid);
 const llmPayload = llmPayloadForAccess(llmProfile, subscriptionAccess);
 if (!token || !hasClientLlmAccess(subscriptionAccess, llmPayload)) return;

 const res = await fetch("/api/articles/repost-suggestions", {
 method: "POST",
 headers: {
 Authorization: `Bearer ${token}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 contentLanguage: article.contentLanguage,
 hook: article.hook,
 body: article.body,
 ps: article.ps,
 exportText: article.exportText,
 llm: llmPayload,
 }),
 });
 const data = await res.json();
 if (!res.ok || !data.suggestions?.length) {
 if (!opts?.quiet) setError(tRepost("loadFailed"));
 return;
 }
 setRepostExpectedTeamCount(
 typeof data.expectedTeamCount === "number" ? data.expectedTeamCount : org.teamMembers?.length,
 );
 await saveArticleRepostSuggestions(user.uid, article.id, data.suggestions);
 setRepostSuggestions(data.suggestions);
 setArticle((prev) =>
 prev ? { ...prev, repostSuggestions: data.suggestions } : prev,
 );
 } catch {
 if (!opts?.quiet) setError(tRepost("loadFailed"));
 } finally {
 setRepostLoading(false);
 }
 },
 [user, article, showOrgMode, organizationProfile, subscriptionAccess, tRepost],
 );

 const load = useCallback(async () => {
 if (!user) return;
 const [a, p, steering] = await Promise.all([
 getArticle(user.uid, articleId),
 getPersona(user.uid),
 gatherAuthorSteeringPayload(user.uid).catch(() => null),
 ]);
 setArticle(
 a
 ? {
 ...a,
 refinement: mergeRefinementWithDefaults(a.refinement),
 }
 : null,
 );
 setPersonaText(p?.promptText ?? "");
 if (a?.selectedCtaStyle) setSelectedCtaStyle(a.selectedCtaStyle);
 setIllustration(a?.illustration ?? null);
 setRepostSuggestions(a?.repostSuggestions ?? null);
 setQualityScores(a?.qualityScores ?? null);
 setAlternativeHooks(a?.alternativeHooks ?? []);
 setQualityCritique(a?.qualityCritique ?? null);
 if (steering) {
 const archetype = resolveContentArchetype({
 author: steering.author ?? null,
 profileEnrichment: steering.profileEnrichment ?? null,
 });
 setShowOrgMode(showsOrganizationProfileFields(archetype));
 const enrichmentDetails = (steering.profileEnrichment ?? null) as Record<
 string,
 import("@/types/workspace").GapAnswerValue
 > | null;
 setOrganizationProfile(parseOrganizationProfile(enrichmentDetails));
 setEditorialPillars(parseEditorialPillars(enrichmentDetails));
 }
 setLoaded(true);
 }, [user, articleId]);

 useEffect(() => {
 if (authLoading) return;
 load().catch(() => setLoaded(true));
 }, [authLoading, load]);

 const ctaFetchedRef = useRef(false);
 const illustrationFetchedRef = useRef<string | null>(null);
 const repostFetchedRef = useRef<string | null>(null);
 const refinementSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const refinementSyncGenRef = useRef(0);
 const refineSectionRef = useRef<HTMLDivElement>(null);
 const postPreviewRef = useRef<HTMLDivElement>(null);
 const ctaSectionRef = useRef<HTMLDivElement>(null);
 const validationActionsRef = useRef<HTMLDivElement>(null);
 const [refineSectionOpen, setRefineSectionOpen] = useState(true);
 const [ctaSectionOpen, setCtaSectionOpen] = useState(false);

 function getMergedRefinement(): ArticleRefinement | null {
 if (!article) return null;
 return mergeRefinementWithDefaults(article.refinement);
 }
 useEffect(() => {
 ctaFetchedRef.current = false;
 illustrationFetchedRef.current = null;
 repostFetchedRef.current = null;
 }, [articleId]);

 const ensureCtaLoaded = useCallback(() => {
 if (
 !loaded ||
 !article ||
 article.status === "validated" ||
 !personaText ||
 ctaFetchedRef.current
 ) {
 return;
 }
 ctaFetchedRef.current = true;
 void loadCtaSuggestions();
 }, [loaded, article, personaText, loadCtaSuggestions]);

 useEffect(() => {
 if (!isWizard) return;
 ensureCtaLoaded();
 }, [isWizard, ensureCtaLoaded]);

 const ensureIllustrationLoaded = useCallback(() => {
 if (!article) return;
 if (article.illustration) {
 setIllustration(article.illustration);
 return;
 }
 if (illustrationFetchedRef.current === article.id) return;
 illustrationFetchedRef.current = article.id;
 const quiet = article.status === "validated";
 void loadIllustrationSuggestions(false, { quiet });
 }, [article, loadIllustrationSuggestions]);

 const ensureRepostLoaded = useCallback(() => {
 if (!article || !showOrgMode) return;
 if (article.repostSuggestions?.length) {
 setRepostSuggestions(article.repostSuggestions);
 return;
 }
 if (repostFetchedRef.current === article.id) return;
 repostFetchedRef.current = article.id;
 void loadRepostSuggestions(false, { quiet: true });
 }, [article, showOrgMode, loadRepostSuggestions]);

 useEffect(() => {
 if (article?.status === "validated" && showOrgMode) {
 ensureRepostLoaded();
 }
 }, [article?.status, article?.id, showOrgMode, ensureRepostLoaded]);

 const scrollToRefineSection = useCallback(() => {
 setRefineSectionOpen(true);
 requestAnimationFrame(() => {
 refineSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
 });
 }, []);

 const scrollToPostPreview = useCallback(() => {
 requestAnimationFrame(() => {
 requestAnimationFrame(() => {
 postPreviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
 });
 });
 }, []);

 const scrollToCtaSection = useCallback(() => {
 setShowValidationNudge(false);
 setCtaSectionOpen(true);
 ensureCtaLoaded();
 requestAnimationFrame(() => {
 ctaSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
 });
 }, [ensureCtaLoaded]);

 const scrollToValidation = useCallback(() => {
 setShowValidationNudge(false);
 requestAnimationFrame(() => {
 validationActionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
 });
 }, []);

 useEffect(() => {
 if (!user || !article?.refinement || article.status === "validated") return;
 if (!hasReviseInput(article.refinement)) return;

 if (refinementSyncTimerRef.current) {
 clearTimeout(refinementSyncTimerRef.current);
 }
 const gen = ++refinementSyncGenRef.current;
 refinementSyncTimerRef.current = setTimeout(() => {
 void (async () => {
 try {
 const status = article.status === "draft" ? "draft" : "refining";
 await persistArticleRefinementAndSyncPersona(
 user.uid,
 article.id,
 article.refinement!,
 article.contentLanguage,
 status,
 );
 if (gen !== refinementSyncGenRef.current) return;
 const p = await getPersona(user.uid);
 if (p?.promptText) setPersonaText(p.promptText);
 notifyArticlesChanged();
 } catch {
 /* debounced sync · ignore transient errors */
 }
 })();
 }, 800);

 return () => {
 if (refinementSyncTimerRef.current) {
 clearTimeout(refinementSyncTimerRef.current);
 }
 };
 }, [user, article?.id, article?.refinement, article?.status, article?.contentLanguage]);

 function updateRefinement(patch: Partial<ArticleRefinement>) {
 if (!article) return;
 const base = mergeRefinementWithDefaults(article.refinement);
 setArticle({
 ...article,
 refinement: { ...base, ...patch },
 });
 }

 function setQuestionAnswer(
 qId: string,
 patch: { answer?: RefinementAnswer; comment?: string },
 ) {
 if (!article) return;
 const refinement = mergeRefinementWithDefaults(article.refinement);
 const questions = refinement.questions.map((q) => {
 if (q.id !== qId) return q;
 const next = { ...q };
 if ("answer" in patch) {
 next.answer = patch.answer;
 }
 if ("comment" in patch) {
 const raw = patch.comment;
 next.comment = raw === undefined || raw === "" ? undefined : raw;
 }
 return next;
 });
 updateRefinement({ questions });
 }

 const loadQualityAnalysis = useCallback(async () => {
 if (!user || !article) return;
 if (!personaText.trim()) {
 setError(tArticles("needPersona"));
 return;
 }
 setQualityLoading(true);
 setError(null);
 try {
 const auth = getClientAuth();
 const token = auth ? await auth.currentUser?.getIdToken() : null;
 const [llmProfile, authorSteering] = await Promise.all([
 getUserLlmProfile(user.uid),
 gatherAuthorSteeringPayload(user.uid),
 ]);
 const llmPayload = llmPayloadForAccess(llmProfile, subscriptionAccess);
 if (!token || !hasClientLlmAccess(subscriptionAccess, llmPayload)) {
 setError(tArticles("noLlmKey"));
 return;
 }

 const res = await fetch("/api/articles/quality", {
 method: "POST",
 headers: {
 Authorization: `Bearer ${token}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 contentLanguage: article.contentLanguage,
 hook: article.hook,
 body: article.body,
 ps: article.ps,
 postBrief: article.postBrief,
 personaPromptText: personaText,
 authorSteering,
 llm: llmPayload,
 }),
 });
 const data = await res.json();
 if (!res.ok) {
 setError(tQuality("loadFailed"));
 return;
 }
 const scores = data.scores as ArticleQualityScores;
 const hooks = (data.alternativeHooks ?? []) as string[];
 const critique = typeof data.critique === "string" ? data.critique : "";
 await saveArticleQuality(user.uid, article.id, {
 qualityScores: scores,
 alternativeHooks: hooks,
 qualityCritique: critique,
 });
 setQualityScores(scores);
 setAlternativeHooks(hooks);
 setQualityCritique(critique || null);
 setArticle((prev) =>
 prev
 ? {
 ...prev,
 qualityScores: scores,
 alternativeHooks: hooks,
 qualityCritique: critique || undefined,
 }
 : prev,
 );
 } catch {
 setError(tQuality("loadFailed"));
 } finally {
 setQualityLoading(false);
 }
 }, [user, article, personaText, subscriptionAccess, tQuality, tArticles]);

 function resolveReviseErrorMessage(errorCode?: string, detail?: string) {
 const { kind, detail: rawDetail } = classifyLlmApiError(errorCode, detail);
 const technical = rawDetail ? truncateApiDetail(rawDetail) : undefined;
 const code = (errorCode ?? "").toLowerCase();
 if (code === "premium_required") {
 return { message: tArticles("premiumRequired"), technical: undefined };
 }
 if (code === "article_feedback_limit") {
 return { message: tArticles("articleFeedbackLimit"), technical: undefined };
 }
 switch (kind) {
 case "no_key":
 return { message: tArticles("noLlmKey"), technical: undefined };
 case "insufficient_credits":
 return { message: tArticles("insufficientCredits"), technical: undefined };
 case "invalid_key":
 return { message: tArticles("invalidApiKey"), technical: undefined };
 case "empty_response":
 return { message: t("reviseEmptyResponse"), technical };
 case "invalid_json":
 return { message: t("reviseJsonFailed"), technical };
 case "rate_limit":
 return { message: t("reviseRateLimit"), technical };
 case "timeout":
 return { message: t("reviseTimeout"), technical };
 default:
 return { message: t("reviseFailed"), technical };
 }
 }

 function setReviseError(
 message: string,
 technical?: string,
 meta?: { errorCode?: string; detail?: string },
 ) {
 setError(message);
 setErrorDetail(technical ?? null);
 setErrorApiCode(meta?.errorCode);
 setErrorApiRawDetail(meta?.detail);
 setErrorScope("refine");
 scrollToRefineSection();
 }

 function setValidateError(
 message: string,
 meta?: { errorCode?: string; detail?: string },
 ) {
 setError(message);
 setErrorDetail(null);
 setErrorApiCode(meta?.errorCode);
 setErrorApiRawDetail(meta?.detail);
 setErrorScope("cta");
 scrollToValidation();
 }

 function clearActionError() {
 setError(null);
 setErrorDetail(null);
 setErrorApiCode(undefined);
 setErrorApiRawDetail(undefined);
 setErrorScope(null);
 }

 async function runRevise(refinement: ArticleRefinement) {
 if (!user || !article) return;
 if (!subscriptionAccess?.canApplyArticleFeedback) {
 setReviseError(
 subscriptionAccess?.isTrialActive &&
 subscriptionAccess.articleFeedbackRemaining === 0
 ? tArticles("articleFeedbackLimit")
 : tArticles("premiumRequired"),
 );
 return;
 }
 if (!hasReviseInput(refinement)) {
 setReviseError(t("needRefinement"));
 return;
 }
 if (!personaText.trim()) {
 setReviseError(tArticles("needPersona"));
 return;
 }
 setPendingAction("revise");
 clearActionError();
 try {
 await saveArticleRefinement(user.uid, article.id, refinement, "refining");

 const auth = getClientAuth();
 const token = auth ? await auth.currentUser?.getIdToken() : null;
 const [llmProfile, authorSteering] = await Promise.all([
 getUserLlmProfile(user.uid),
 gatherAuthorSteeringPayload(user.uid),
 ]);
 const llmPayload = llmPayloadForAccess(llmProfile, subscriptionAccess);
 if (!token || !hasClientLlmAccess(subscriptionAccess, llmPayload)) {
 setReviseError(tArticles("noLlmKey"));
 return;
 }

 const res = await fetch("/api/articles/revise", {
 method: "POST",
 headers: {
 Authorization: `Bearer ${token}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 personaPromptText: personaText,
 contentLanguage: article.contentLanguage,
 article: {
 hook: article.hook,
 body: article.body,
 ps: article.ps,
 scope: article.scope,
 hashtags: article.hashtags,
 },
 newsSource: article.newsSource,
 refinement,
 postBrief: article.postBrief,
 authorSteering,
 llm: llmPayload,
 }),
 });
 const data = (await res.json()) as {
 error?: string;
 detail?: string;
 hook?: string;
 body?: string;
 ps?: string;
 scope?: string;
 hashtags?: string[];
 };
 if (!res.ok) {
 const detailStr = String(data.detail ?? "");
 const { message, technical } = resolveReviseErrorMessage(data.error, detailStr);
 setReviseError(message, technical, {
 errorCode: data.error,
 detail: detailStr || undefined,
 });
 return;
 }

 if (!data.body?.trim()) {
 const { message, technical } = resolveReviseErrorMessage("Empty revision");
 setReviseError(message, technical);
 return;
 }

 const revised = {
 hook: data.hook?.trim() ?? article.hook,
 body: data.body.trim(),
 ps: data.ps?.trim() || undefined,
 scope: (data.scope as ArticleScope | undefined) ?? article.scope,
 hashtags: Array.isArray(data.hashtags) ? data.hashtags : article.hashtags,
 };

 await updateArticleContent(user.uid, article.id, revised);
 notifyArticlesChangedDeferred();
 setArticle((prev) =>
 prev
 ? {
 ...prev,
 ...revised,
 refinement: { ...refinement, status: "draft" },
 }
 : prev,
 );
 setPendingAction(null);
 scrollToPostPreview();
 setShowValidationNudge(true);

 void (async () => {
 try {
 await markArticleRegenerated(user.uid, article.id, refinement);
 await recordArticleRefinementFeedback(
 user.uid,
 article.id,
 refinement,
 article.contentLanguage,
 );
 const p = await getPersona(user.uid);
 if (p?.promptText) setPersonaText(p.promptText);
 illustrationFetchedRef.current = null;
 await load();
 void refreshSubscription();
 void loadIllustrationSuggestions(true, { quiet: true });
 } catch {
 /* revision already applied in UI */
 }
 })();
 return;
 } catch (e) {
 const msg = e instanceof Error ? e.message : "";
 const { message, technical } = resolveReviseErrorMessage(undefined, msg);
 setReviseError(message, technical || msg || undefined);
 } finally {
 setPendingAction(null);
 }
 }

 async function onApplyFeedback() {
 const refinement = getMergedRefinement();
 if (!refinement) return;
 await runRevise(refinement);
 }

 async function onReviseIntent(intent: ReviseIntent) {
 if (!article) return;
 const refinement: ArticleRefinement = {
 ...mergeRefinementWithDefaults(article.refinement),
 globalComment: getReviseIntentPrompt(intent, article.contentLanguage),
 };
 setArticle({ ...article, refinement });
 await runRevise(refinement);
 }

 async function onApplyHook(hook: string) {
 if (!user || !article) return;
 await updateArticleContent(user.uid, article.id, {
 hook,
 body: article.body,
 ps: article.ps,
 scope: article.scope,
 hashtags: article.hashtags,
 });
 notifyArticlesChanged();
 setArticle({ ...article, hook });
 }

 async function onValidate() {
 if (!user || !article) return;
 const chosen = selectedCtaStyle
  ? ctaSuggestions.find((s) => s.style === selectedCtaStyle)
  : undefined;
 if (!personaText.trim()) {
 setValidateError(tArticles("needPersona"));
 return;
 }
 setPendingAction("validate");
 clearActionError();
 try {
 const auth = getClientAuth();
 const token = auth ? await auth.currentUser?.getIdToken() : null;
 const [authorSteering, llmProfile] = await Promise.all([
 gatherAuthorSteeringPayload(user.uid),
 getUserLlmProfile(user.uid),
 ]);
 if (!token) {
 setValidateError(t("validateFailed"));
 return;
 }

 let hashtags = article.hashtags ?? [];
 const llmPayload = llmPayloadForAccess(llmProfile, subscriptionAccess);
 if (hasClientLlmAccess(subscriptionAccess, llmPayload)) {
 const tagRes = await fetch("/api/articles/hashtags", {
 method: "POST",
 headers: {
 Authorization: `Bearer ${token}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 personaPromptText: personaText,
 contentLanguage: article.contentLanguage,
 hook: article.hook,
 body: article.body,
 ps: article.ps,
 ...(chosen?.text ? { ctaText: chosen.text } : {}),
 authorSteering,
 llm: llmPayload,
 }),
 });
 const tagData = (await tagRes.json()) as {
 hashtags?: string[];
 error?: string;
 detail?: string;
 };
 if (tagRes.ok && tagData.hashtags?.length) {
 hashtags = tagData.hashtags;
 } else if (!tagRes.ok) {
 const detail = String(tagData.detail ?? tagData.error ?? "");
 if (tagData.error === "no_llm_key" || !hasClientLlmAccess(subscriptionAccess, llmPayload)) {
 setValidateError(tArticles("noLlmKey"));
 return;
 }
 if (isInvalidApiKeyError(detail)) {
 setValidateError(tArticles("invalidApiKey"));
 return;
 }
 /* Hashtags optionnels : on valide quand même avec les tags existants */
 }
 }

 let closingForExport = chosen?.text ?? "";
 let hookForExport = article.hook;
 let bodyForExport = article.body;
 let psForExport = article.ps;

 if (chosen && hasClientLlmAccess(subscriptionAccess, llmPayload)) {
 const intRes = await fetch("/api/articles/integrate-cta", {
 method: "POST",
 headers: {
 Authorization: `Bearer ${token}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 hook: article.hook,
 body: article.body,
 ps: article.ps,
 ctaDraft: chosen.text,
 ctaStyle: chosen.style,
 contentLanguage: article.contentLanguage,
 llm: llmPayload,
 }),
 });
 const intData = (await intRes.json()) as { closingBlock?: string };
 if (intRes.ok && intData.closingBlock?.trim()) {
 closingForExport = intData.closingBlock.trim();
 }

 const unifyRes = await fetch("/api/articles/unify-export", {
 method: "POST",
 headers: {
 Authorization: `Bearer ${token}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 hook: article.hook,
 body: article.body,
 ps: article.ps,
 closingBlock: closingForExport,
 ctaStyle: chosen.style,
 contentLanguage: article.contentLanguage,
 llm: llmPayload,
 }),
 });
 const unifyData = (await unifyRes.json()) as {
 hook?: string;
 body?: string;
 ps?: string;
 closingBlock?: string;
 };
 if (unifyRes.ok && unifyData.body?.trim() && unifyData.closingBlock?.trim()) {
 hookForExport = unifyData.hook?.trim() || article.hook;
 bodyForExport = unifyData.body.trim();
 psForExport = unifyData.ps?.trim() || undefined;
 closingForExport = unifyData.closingBlock.trim();
 }
 }

 const ctaLink = chosen ? sanitizeCtaLinkUrl(chosen.linkUrl) : undefined;
 const fitted = fitLinkedInArticleParts(
 {
 hook: hookForExport,
 body: bodyForExport,
 ps: psForExport,
 },
 maxDraftCharsForArticle(hashtags),
 );
 const exportText = buildExportText(
 fitted.hook,
 fitted.body,
 fitted.ps,
 closingForExport,
 ctaLink,
 hashtags,
 );
 await updateArticleContent(user.uid, article.id, {
 hook: fitted.hook,
 body: fitted.body,
 ps: fitted.ps,
 });
 await validateArticleWithCta(
 user.uid,
 article.id,
 exportText,
 chosen
 ? {
 style: chosen.style,
 text: chosen.text,
 linkUrl: ctaLink,
 }
 : null,
 hashtags,
 {
 idToken: token,
 hook: fitted.hook,
 body: fitted.body,
 ps: fitted.ps,
 },
 );
 try {
 await recordArticleValidateFeedback(
 user.uid,
 article.id,
 getMergedRefinement() ?? mergeRefinementWithDefaults(article.refinement),
 article.contentLanguage,
 chosen?.style ?? null,
 );
 } catch {
 /* La validation LinkedIn ne doit pas échouer si la sync Persona rate */
 }
 clearActionError();
 setShowValidationNudge(false);
 await load();
 notifyArticlesChanged();
 if (showOrgMode) {
 repostFetchedRef.current = null;
 void loadRepostSuggestions(true, { quiet: true });
 }
 scrollToPostPreview();
 } catch (err) {
 const code = err instanceof Error ? err.message : "validate_failed";
 if (code === "not_found") {
 setValidateError(t("validateNotFound"));
 } else if (code === "forbidden") {
 setValidateError(t("validateForbidden"));
 } else if (
 code === "no_llm_key" ||
 code === "own_llm_required" ||
 code === "subscription_required"
 ) {
 setValidateError(tArticles("noLlmKey"));
 } else if (code === "invalid_api_key") {
 setValidateError(tArticles("invalidApiKey"));
 } else if (code === "pro_cap" || code === "pro_plus_cap") {
 setValidateError(tArticles("insufficientCredits"));
 } else if (code === "subscription_expired" || code === "trial_posts_exhausted") {
 setValidateError(tArticles("insufficientCredits"));
 } else {
 setValidateError(t("validateFailed"), { errorCode: code });
 }
 } finally {
 setPendingAction(null);
 }
 }

 async function onCopyToLinkedIn() {
 if (!article?.exportText) return;
 const ok = await copyAndOpenLinkedInComposer(article.exportText);
 if (!ok) {
 setError(t("copyFailed"));
 return;
 }
 setError(null);
 setCopied(true);
 setTimeout(() => setCopied(false), 4000);
 }

 if (!loaded) {
 return <GeneratingIndicator label="…" className="max-w-xl" />;
 }

 if (!article) {
 return (
 <p className="text-sm text-ns-secondary">
 {t("notFound")}{" "}
 <Link href="/articles" className="underline">
 {t("back")}
 </Link>
 </p>
 );
 }

 const isValidated = article.status === "validated";
 const isRevising = pendingAction === "revise";
 const isValidating = pendingAction === "validate";
 const isBusy = pendingAction !== null;
 const mergedRefinement = getMergedRefinement();
 const canApplyFeedback = mergedRefinement
 ? hasReviseInput(mergedRefinement)
 : false;
 const hasBodyLink =
 bodyContainsExternalLink(article.body) ||
 (article.ps ? bodyContainsExternalLink(article.ps) : false);

 const credibilitySummary =
 showOrgMode && organizationProfile
 ? credibilityChecklistSummary(
 runCredibilityChecklist(
 article.hook,
 article.body,
 article.ps,
 organizationProfile,
 ),
 )
 : { canValidate: true, hasFail: false, hasWarn: false, allPass: true };

 const pillarLabel = article.editorialPillarId
 ? editorialPillars.find((p) => p.id === article.editorialPillarId)?.label ??
 article.editorialPillarId
 : undefined;

 return (
 <div className="space-y-6">
 {!isWizard && (
 <Link href="/articles" className="text-sm text-ns-secondary hover:text-ns-tertiary">
 ← {t("back")}
 </Link>
 )}

 {article.newsSource && (
 <div className="rounded-lg border border-sky-200/80 bg-sky-50/80 px-4 py-3 text-sm">
 <p className="font-medium text-ns-tertiary">{t("newsAnchor")}</p>
 <p className="mt-1 text-xs text-ns-secondary">{t("newsSourceInComment")}</p>
 <p className="mt-1 text-ns-secondary">{article.newsSource.title}</p>
 <a
 href={article.newsSource.url}
 target="_blank"
 rel="noopener noreferrer"
 className="mt-2 inline-block text-xs font-medium text-sky-800 underline"
 >
 {t("readSource")}
 </a>
 </div>
 )}

 {article.inspirationSource && (
 <div className="rounded-lg border border-violet-200/80 bg-violet-50/80 px-4 py-3 text-sm">
 <p className="font-medium text-ns-tertiary">{t("inspirationAnchor")}</p>
 <p className="mt-1 text-xs text-ns-secondary">{t("inspirationAnchorHint")}</p>
 {article.inspirationSource.label && (
 <p className="mt-1 text-ns-secondary">{article.inspirationSource.label}</p>
 )}
 <a
 href={article.inspirationSource.url}
 target="_blank"
 rel="noopener noreferrer"
 className="mt-2 inline-block text-xs font-medium text-violet-900 underline"
 >
 {t("readInspirationSource")}
 </a>
 </div>
 )}

 {!isWizard && (
 <p className="flex flex-wrap items-center gap-2 text-xs font-medium text-ns-secondary">
 <span>{t("personaAlignedHint")}</span>
 <ContextHelp label={tDetailHelp("topicDna.label")}>
 {tDetailHelp("topicDna.body")}
 </ContextHelp>
 <ArticleDraftReviewLinkButton articleId={articleId} />
 </p>
 )}

 <div ref={postPreviewRef} className="scroll-mt-6 rounded-2xl border border-gray-100 bg-ns-surface p-5">
 <div className="mb-3 flex justify-end">
 <LinkedInCharCount
 text={joinLinkedInPostParts({
 hook: article.hook,
 body: article.body,
 ps: article.ps,
 })}
 />
 </div>
 {isWizard && (
 <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ns-secondary">
 {t("hookLabel")}
 </p>
 )}
 <p className="text-lg font-semibold text-ns-tertiary whitespace-pre-wrap">
 {article.hook}
 </p>
 {isWizard && (
 <p className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-ns-secondary">
 {t("bodyLabel")}
 </p>
 )}
 <p className="mt-4 text-sm text-ns-tertiary whitespace-pre-wrap leading-relaxed">
 {article.body}
 </p>
 {article.ps && (
 <p className="mt-4 text-sm text-ns-secondary whitespace-pre-wrap">{article.ps}</p>
 )}
 {article.hashtags && article.hashtags.length > 0 && (
 <p className="mt-4 text-sm font-medium text-sky-800">
 {formatHashtagsLine(article.hashtags)}
 </p>
 )}
 {!isValidated && (
 <p className="mt-3 text-xs text-ns-secondary">{t("hashtagsHint")}</p>
 )}
 </div>

 {!isValidated && showValidationNudge && (
 <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
 <p className="text-sm text-emerald-950">{t("postUpdatedNudge")}</p>
 <button
 type="button"
 onClick={scrollToValidation}
 className="shrink-0 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
 >
 {t("goToValidation")}
 </button>
 </div>
 )}

 {isValidated && article.exportText && (
 <div className="space-y-3">
 <div className="flex items-end justify-between gap-3">
 <h2 className="text-sm font-medium text-ns-tertiary">{t("exportPreview")}</h2>
 <LinkedInCharCount text={article.exportText} />
 </div>
 <div className="rounded-xl border border-gray-100 bg-ns-brand-light p-4">
 <pre className="whitespace-pre-wrap text-sm text-ns-tertiary">{article.exportText}</pre>
 <ArticleIllustrationPanelLazy
 variant="inline"
 illustration={illustration}
 loading={illustrationLoading}
 regenerateDisabled={isBusy}
 onRegenerate={() => {
 illustrationFetchedRef.current = null;
 void loadIllustrationSuggestions(true);
 }}
 />
 {showOrgMode && (
 <ArticleRepostPanelLazy
 variant="inline"
 suggestions={repostSuggestions}
 expectedTeamCount={
 repostExpectedTeamCount ?? organizationProfile?.teamMembers?.length
 }
 loading={repostLoading}
 regenerateDisabled={isBusy}
 onRegenerate={() => {
 repostFetchedRef.current = null;
 void loadRepostSuggestions(true);
 }}
 />
 )}
 {showOrgMode && article.exportText && (
 <ArticleDeliveryPackPanelLazy
 variant="inline"
 exportText={article.exportText}
 illustration={illustration}
 repostSuggestions={repostSuggestions}
 pillarLabel={pillarLabel}
 articleId={article.id}
 />
 )}
 {user && (
 <ArticlePerformancePanelLazy
 userId={user.uid}
 articleId={article.id}
 signals={article.performanceSignals}
 onSaved={(signals: ArticlePerformanceSignals) =>
 setArticle((prev) => (prev ? { ...prev, performanceSignals: signals } : prev))
 }
 />
 )}
 </div>
 <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
 <button
 type="button"
 onClick={onCopyToLinkedIn}
 className="rounded-sm bg-ns-primary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-sm hover:bg-ns-primary/90"
 >
 {copied ? t("copied") : t("copyLinkedIn")}
 </button>
 </div>
 <p className="text-xs font-medium leading-relaxed text-ns-secondary">
 {t("copyLinkedInHint")}
 </p>
 </div>
 )}

 {hasBodyLink && (
 <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
 {article.newsSource
 ? tQuality("linkWarningNews")
 : tQuality("linkWarning")}
 </div>
 )}

 {isWizard && !isValidated && (
 <ArticleQualityPanelLazy
 article={article}
 scores={qualityScores}
 alternativeHooks={alternativeHooks}
 critique={qualityCritique}
 loading={qualityLoading}
 onAnalyze={loadQualityAnalysis}
 onApplyHook={onApplyHook}
 onReviseIntent={onReviseIntent}
 revising={isRevising}
 />
 )}

 {!isValidated && article.refinement && !isWizard ? (
 <EditorCollapsibleSection
 icon="refine"
 title={tRef("title")}
 hint={t("sections.refine.hint")}
 open={refineSectionOpen}
 onOpenChange={setRefineSectionOpen}
 sectionRef={refineSectionRef}
 >
 <div className="space-y-5">
 {error && errorScope === "refine" && (
 <UserErrorBanner
 surface="article-editor-refine"
 userMessage={error}
 technical={errorDetail ?? errorApiRawDetail}
 errorCode={errorApiCode}
 detail={errorApiRawDetail}
 >
 {error === t("reviseFailed") && !errorDetail && !errorApiRawDetail ? (
 <p className="text-xs">{t("reviseFailedHint")}</p>
 ) : null}
 {(error === tArticles("noLlmKey") ||
 error === tArticles("invalidApiKey") ||
 error === tArticles("insufficientCredits") ||
 error === tArticles("needPersona")) && (
 <Link
 href={
 error === tArticles("needPersona") ? "/persona" : "/setup/llm"
 }
 className="text-sm font-semibold underline"
 >
 →{" "}
 {error === tArticles("needPersona")
 ? tArticles("goPersona")
 : tArticles("goLlmSetup")}
 </Link>
 )}
 </UserErrorBanner>
 )}
 {subscriptionAccess?.articleFeedbackRemaining != null &&
 subscriptionAccess.articleFeedbackRemaining > 0 && (
 <p className="text-xs text-ns-secondary">
 {tArticles("freeFeedbackRemaining", {
 count: subscriptionAccess.articleFeedbackRemaining,
 })}
 </p>
 )}
 {article.refinement.questions.map((q) => {
 const answerOptions: RefinementAnswer[] = ["yes", "no", "partial"];
 const questionLabel =
 q.id === "tone"
 ? tRef("tone")
 : q.id === "theme"
 ? tRef("theme")
 : q.id === "length"
 ? tRef("length")
 : tRef("hook");

 return (
 <div key={q.id} className="space-y-2">
 <p className="text-sm font-medium text-ns-tertiary">{questionLabel}</p>
 <div className="flex flex-wrap gap-2">
 {answerOptions.map((ans) => (
 <button
 key={ans}
 type="button"
 onClick={() => setQuestionAnswer(q.id, { answer: ans })}
 className={
 q.answer === ans
 ? "rounded-sm bg-ns-tertiary px-3 py-1.5 text-xs font-black uppercase text-ns-primary"
 : "rounded-lg border border-ns-alternate px-3 py-1.5 text-xs text-ns-tertiary"
 }
 >
 {ans === "yes"
 ? tRef("answers.yes")
 : ans === "no"
 ? tRef("answers.no")
 : tRef("answers.partial")}
 </button>
 ))}
 </div>
 <ImeSafeInput
 type="text"
 value={q.comment ?? ""}
 onValueChange={(comment) =>
 setQuestionAnswer(q.id, { comment })
 }
 placeholder={tRef("commentPlaceholder")}
 className={INPUT_CLASS}
 />
 </div>
 );
 })}
 <ToneEdgePicker
 value={(article.refinement.toneEdge ?? "default") as ToneEdge}
 onChange={(toneEdge) => updateRefinement({ toneEdge })}
 />
 <EmojiLevelPicker
 variant="compact"
 value={(article.refinement.emojiLevel ?? "light") as EmojiLevel}
 onChange={(emojiLevel) => updateRefinement({ emojiLevel })}
 />
 {(article.refinement.toneEdge ?? "default") === "corrosive" && (
 <button
 type="button"
 disabled={isBusy}
 onClick={onApplyFeedback}
 className="w-full rounded-lg border border-ns-tertiary/30 bg-white px-4 py-2.5 text-sm font-medium text-ns-tertiary hover:bg-ns-brand-light disabled:opacity-50 sm:w-auto"
 >
 {isRevising ? tRef("toneEdgeApplying") : tRef("toneEdgeApply")}
 </button>
 )}
 <div>
 <label className={LABEL_CLASS}>{tRef("globalComment")}</label>
 <ImeSafeTextarea
 rows={3}
 value={article.refinement.globalComment ?? ""}
 onValueChange={(globalComment) => updateRefinement({ globalComment })}
 className={INPUT_CLASS}
 />
 </div>
 {isRevising && (
 <GeneratingIndicator
 label={t("revising")}
 hint={t("revisingHint")}
 className="max-w-xl"
 />
 )}
 <div className="flex flex-col gap-3 border-t border-ns-alternate/40 pt-4">
 <button
 type="button"
 disabled={isBusy || (!canApplyFeedback && !isRevising)}
 onClick={() => void onApplyFeedback()}
 className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ns-alternate bg-white px-4 py-2.5 text-sm font-semibold text-ns-tertiary hover:bg-ns-brand-light disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:justify-start"
 >
 {isRevising && (
 <ButtonSpinner className="border-ns-alternate border-t-zinc-800" />
 )}
 {isRevising ? t("revising") : t("applyFeedback")}
 </button>
 {!canApplyFeedback && !isRevising && (
 <p className="text-xs text-ns-secondary">{t("needRefinement")}</p>
 )}
 {!isValidated && (
 <button
 type="button"
 onClick={scrollToValidation}
 className="w-full text-left text-sm font-semibold text-ns-tertiary underline hover:text-ns-primary sm:w-auto"
 >
 {t("goToValidation")}
 </button>
 )}
 </div>
 </div>
 </EditorCollapsibleSection>
 ) : null}

 {!isValidated && article.refinement && isWizard ? (
 <div
 ref={refineSectionRef}
 className="scroll-mt-6 rounded-xl border border-ns-alternate/70 bg-white p-4 shadow-sm sm:p-5"
 >
 <EditorBlockHeader
 icon="refine"
 title={tRef("title")}
 hint={t("sections.refine.hint")}
 />
 <div className="mt-5 space-y-5">
 {error && errorScope === "refine" && (
 <UserErrorBanner
 surface="article-editor-refine"
 userMessage={error}
 technical={errorDetail ?? errorApiRawDetail}
 errorCode={errorApiCode}
 detail={errorApiRawDetail}
 >
 {error === t("reviseFailed") && !errorDetail && !errorApiRawDetail ? (
 <p className="text-xs">{t("reviseFailedHint")}</p>
 ) : null}
 {(error === tArticles("noLlmKey") ||
 error === tArticles("invalidApiKey") ||
 error === tArticles("insufficientCredits") ||
 error === tArticles("needPersona")) && (
 <Link
 href={
 error === tArticles("needPersona") ? "/persona" : "/setup/llm"
 }
 className="text-sm font-semibold underline"
 >
 →{" "}
 {error === tArticles("needPersona")
 ? tArticles("goPersona")
 : tArticles("goLlmSetup")}
 </Link>
 )}
 </UserErrorBanner>
 )}
 {subscriptionAccess?.articleFeedbackRemaining != null &&
 subscriptionAccess.articleFeedbackRemaining > 0 && (
 <p className="text-xs text-ns-secondary">
 {tArticles("freeFeedbackRemaining", {
 count: subscriptionAccess.articleFeedbackRemaining,
 })}
 </p>
 )}
 {article.refinement.questions.map((q) => {
 const answerOptions: RefinementAnswer[] = ["yes", "no", "partial"];
 const questionLabel =
 q.id === "tone"
 ? tRef("tone")
 : q.id === "theme"
 ? tRef("theme")
 : q.id === "length"
 ? tRef("length")
 : tRef("hook");

 return (
 <div key={q.id} className="space-y-2">
 <p className="text-sm font-medium text-ns-tertiary">{questionLabel}</p>
 <div className="flex flex-wrap gap-2">
 {answerOptions.map((ans) => (
 <button
 key={ans}
 type="button"
 onClick={() => setQuestionAnswer(q.id, { answer: ans })}
 className={
 q.answer === ans
 ? "rounded-sm bg-ns-tertiary px-3 py-1.5 text-xs font-black uppercase text-ns-primary"
 : "rounded-lg border border-ns-alternate px-3 py-1.5 text-xs text-ns-tertiary"
 }
 >
 {ans === "yes"
 ? tRef("answers.yes")
 : ans === "no"
 ? tRef("answers.no")
 : tRef("answers.partial")}
 </button>
 ))}
 </div>
 <ImeSafeInput
 type="text"
 value={q.comment ?? ""}
 onValueChange={(comment) =>
 setQuestionAnswer(q.id, { comment })
 }
 placeholder={tRef("commentPlaceholder")}
 className={INPUT_CLASS}
 />
 </div>
 );
 })}
 <ToneEdgePicker
 value={(article.refinement.toneEdge ?? "default") as ToneEdge}
 onChange={(toneEdge) => updateRefinement({ toneEdge })}
 />
 <EmojiLevelPicker
 variant="compact"
 value={(article.refinement.emojiLevel ?? "light") as EmojiLevel}
 onChange={(emojiLevel) => updateRefinement({ emojiLevel })}
 />
 {(article.refinement.toneEdge ?? "default") === "corrosive" && (
 <button
 type="button"
 disabled={isBusy}
 onClick={onApplyFeedback}
 className="w-full rounded-lg border border-ns-tertiary/30 bg-white px-4 py-2.5 text-sm font-medium text-ns-tertiary hover:bg-ns-brand-light disabled:opacity-50 sm:w-auto"
 >
 {isRevising ? tRef("toneEdgeApplying") : tRef("toneEdgeApply")}
 </button>
 )}
 <div>
 <label className={LABEL_CLASS}>{tRef("globalComment")}</label>
 <ImeSafeTextarea
 rows={3}
 value={article.refinement.globalComment ?? ""}
 onValueChange={(globalComment) => updateRefinement({ globalComment })}
 className={INPUT_CLASS}
 />
 </div>
 {isRevising && (
 <GeneratingIndicator
 label={t("revising")}
 hint={t("revisingHint")}
 className="max-w-xl"
 />
 )}
 <div className="flex flex-col gap-3 border-t border-ns-alternate/40 pt-4">
 <button
 type="button"
 disabled={isBusy || (!canApplyFeedback && !isRevising)}
 onClick={() => void onApplyFeedback()}
 className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ns-alternate bg-white px-4 py-2.5 text-sm font-semibold text-ns-tertiary hover:bg-ns-brand-light disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:justify-start"
 >
 {isRevising && (
 <ButtonSpinner className="border-ns-alternate border-t-zinc-800" />
 )}
 {isRevising ? t("revising") : t("applyFeedback")}
 </button>
 {!canApplyFeedback && !isRevising && (
 <p className="text-xs text-ns-secondary">{t("needRefinement")}</p>
 )}
 {!isValidated && (
 <button
 type="button"
 onClick={scrollToValidation}
 className="w-full text-left text-sm font-semibold text-ns-tertiary underline hover:text-ns-primary sm:w-auto"
 >
 {t("goToValidation")}
 </button>
 )}
 </div>
 </div>
 </div>
 ) : null}

 {!isWizard && !isValidated && (
 <EditorCollapsibleSection
 icon="analysis"
 title={t("sections.analysis.title")}
 hint={t("sections.analysis.hint")}
 defaultOpen={false}
 lazyMount
 >
 <ArticleQualityPanelLazy
 embedded
 article={article}
 scores={qualityScores}
 alternativeHooks={alternativeHooks}
 critique={qualityCritique}
 loading={qualityLoading}
 onAnalyze={loadQualityAnalysis}
 onApplyHook={onApplyHook}
 onReviseIntent={onReviseIntent}
 revising={isRevising}
 />
 <ArticleSlopPanelLazy
 embedded
 article={article}
 disabled={isBusy}
 onSave={async (slop) => {
 if (!user) return;
 await saveArticleSlopAnalysis(user.uid, article.id, slop);
 setArticle((prev) => (prev ? { ...prev, slopAnalysis: slop } : prev));
 }}
 />
 </EditorCollapsibleSection>
 )}

 {!isWizard && isValidated && (
 <EditorCollapsibleSection
 icon="analysis"
 title={t("sections.analysis.title")}
 hint={t("sections.analysis.hintValidated")}
 defaultOpen={false}
 lazyMount
 >
 <ArticleSlopPanelLazy
 embedded
 article={article}
 disabled={isBusy}
 onSave={async (slop) => {
 if (!user) return;
 await saveArticleSlopAnalysis(user.uid, article.id, slop);
 setArticle((prev) => (prev ? { ...prev, slopAnalysis: slop } : prev));
 }}
 />
 </EditorCollapsibleSection>
 )}

 {!isValidated && !isWizard ? (
 <EditorCollapsibleSection
 icon="cta"
 title={tCta("title")}
 hint={t("sections.cta.hint")}
 titleExtra={
 <span onClick={(event) => event.stopPropagation()}>
 <ContextHelp label={tCta("help.label")}>{tCta("help.body")}</ContextHelp>
 </span>
 }
 actions={
 <button
 type="button"
 disabled={ctaLoading || isBusy}
 onClick={loadCtaSuggestions}
 className="text-xs font-medium text-ns-secondary underline hover:text-ns-tertiary disabled:opacity-50"
 >
 {ctaLoading ? "…" : tCta("regenerate")}
 </button>
 }
 open={ctaSectionOpen}
 onOpenChange={(open) => {
 setCtaSectionOpen(open);
 if (open) ensureCtaLoaded();
 }}
 onFirstOpen={ensureCtaLoaded}
 lazyMount
 sectionRef={ctaSectionRef}
 >
 <div className="space-y-4">
 <p className="text-sm text-ns-secondary">{tCta("subtitle")}</p>

 {ctaLoading && (
 <GeneratingIndicator label={tCta("loading")} className="max-w-md" />
 )}

 {!ctaLoading && ctaSuggestions.length > 0 && (
 <ul className="grid gap-3 sm:grid-cols-3">
 {ctaSuggestions.map((s) => (
 <li key={s.style}>
 <button
 type="button"
 onClick={() => setSelectedCtaStyle(s.style)}
 className={
 selectedCtaStyle === s.style
 ? "h-full w-full rounded-xl border-2 border-zinc-900 bg-ns-brand-light p-4 text-left"
 : "h-full w-full rounded-2xl border border-gray-100 bg-ns-surface p-4 text-left hover:border-ns-primary"
 }
 >
 <p className="text-xs font-semibold uppercase tracking-wide text-ns-secondary">
 {tCta(`styles.${s.style}`)}
 </p>
 <p className="mt-2 text-sm text-ns-tertiary whitespace-pre-wrap">
 {s.text}
 </p>
 {s.linkUrl && (
 <p className="mt-2 truncate text-xs text-ns-secondary">{s.linkUrl}</p>
 )}
 </button>
 </li>
 ))}
 </ul>
 )}

 </div>
 </EditorCollapsibleSection>
 ) : null}

 {!isValidated && isWizard ? (
 <div
 ref={ctaSectionRef}
 className="scroll-mt-6 rounded-xl border border-ns-alternate/70 bg-white p-4 shadow-sm sm:p-5 space-y-4"
 >
 <EditorBlockHeader
 icon="cta"
 title={tCta("title")}
 hint={tCta("subtitle")}
 titleExtra={<ContextHelp label={tCta("help.label")}>{tCta("help.body")}</ContextHelp>}
 actions={
 <button
 type="button"
 disabled={ctaLoading || isBusy}
 onClick={loadCtaSuggestions}
 className="text-xs font-medium text-ns-secondary underline hover:text-ns-tertiary disabled:opacity-50"
 >
 {ctaLoading ? "…" : tCta("regenerate")}
 </button>
 }
 />

 {ctaLoading && (
 <GeneratingIndicator label={tCta("loading")} className="max-w-md" />
 )}

 {!ctaLoading && ctaSuggestions.length > 0 && (
 <ul className="grid gap-3 sm:grid-cols-3">
 {ctaSuggestions.map((s) => (
 <li key={s.style}>
 <button
 type="button"
 onClick={() => setSelectedCtaStyle(s.style)}
 className={
 selectedCtaStyle === s.style
 ? "h-full w-full rounded-xl border-2 border-zinc-900 bg-ns-brand-light p-4 text-left"
 : "h-full w-full rounded-2xl border border-gray-100 bg-ns-surface p-4 text-left hover:border-ns-primary"
 }
 >
 <p className="text-xs font-semibold uppercase tracking-wide text-ns-secondary">
 {tCta(`styles.${s.style}`)}
 </p>
 <p className="mt-2 text-sm text-ns-tertiary whitespace-pre-wrap">
 {s.text}
 </p>
 {s.linkUrl && (
 <p className="mt-2 truncate text-xs text-ns-secondary">{s.linkUrl}</p>
 )}
 </button>
 </li>
 ))}
 </ul>
 )}

 </div>
 ) : null}

 {!isWizard ? (
 <EditorCollapsibleSection
 icon="enrich"
 title={t("sections.enrich.title")}
 hint={t("sections.enrich.hint")}
 defaultOpen={false}
 lazyMount
 >
 <ArticleFormatPanelLazy
 embedded
 article={article}
 personaText={personaText}
 disabled={isBusy}
 onUpdated={(patch) =>
 setArticle((prev) => (prev ? { ...prev, ...patch } : prev))
 }
 />
 </EditorCollapsibleSection>
 ) : (
 <ArticleFormatPanel
 article={article}
 personaText={personaText}
 disabled={isBusy}
 onUpdated={(patch) => setArticle((prev) => (prev ? { ...prev, ...patch } : prev))}
 />
 )}

 {!isWizard && (
 <EditorCollapsibleSection
 icon="share"
 title={t("sections.share.title")}
 hint={t("sections.share.hint")}
 defaultOpen={false}
 lazyMount
 >
 <ArticleShareActionsLazy article={article} />
 </EditorCollapsibleSection>
 )}

 {!isWizard && !isValidated && (
 <EditorCollapsibleSection
 icon="illustration"
 title={t("sections.illustration.title")}
 hint={t("sections.illustration.hint")}
 defaultOpen={false}
 lazyMount
 onFirstOpen={ensureIllustrationLoaded}
 onOpenChange={(open) => {
 if (open) ensureIllustrationLoaded();
 }}
 >
 <ArticleIllustrationPanelLazy
 embedded
 illustration={illustration}
 loading={illustrationLoading}
 regenerateDisabled={isBusy}
 onRegenerate={() => {
 illustrationFetchedRef.current = null;
 void loadIllustrationSuggestions(true);
 }}
 />
 </EditorCollapsibleSection>
 )}

 {!isValidated && (
 <div
 ref={validationActionsRef}
 className="scroll-mt-6 mb-6 rounded-xl border border-ns-alternate/70 bg-white p-4 shadow-sm sm:mb-8 sm:p-5"
 >
 <EditorBlockHeader
 icon="validate"
 title={t("validationStepTitle")}
 hint={t("validationStepHint")}
 />

 <div className="mt-4 space-y-4">
 {showOrgMode && organizationProfile && user && (
 <ArticleCredibilityChecklistLazy
 compact
 hook={article.hook}
 body={article.body}
 ps={article.ps}
 orgProfile={organizationProfile}
 contentLanguage={article.contentLanguage}
 userId={user.uid}
 subscriptionAccess={subscriptionAccess}
 />
 )}

 {!selectedCtaStyle && !ctaLoading && ctaSuggestions.length > 0 && (
 <p className="rounded-lg border border-sky-200/70 bg-sky-50/50 px-3 py-2.5 text-sm leading-relaxed text-sky-950">
 {t("validateNoCtaReminder")}{" "}
 <button
 type="button"
 onClick={scrollToCtaSection}
 className="font-semibold text-sky-900 underline hover:text-sky-700"
 >
 {t("customizeCtaLink")}
 </button>
 </p>
 )}

 {isValidating && (
 <GeneratingIndicator
 label={t("validating")}
 hint={t("validatingHint")}
 className="max-w-xl"
 />
 )}

 {!credibilitySummary.canValidate && (
 <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-950">
 {tCred("blockValidate")}
 </p>
 )}

 <button
 type="button"
 disabled={isBusy || ctaLoading || !credibilitySummary.canValidate}
 onClick={() => void onValidate()}
 className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-ns-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-black shadow-sm hover:bg-ns-primary/90 disabled:opacity-50 sm:w-auto"
 >
 {isValidating && <ButtonSpinner />}
 {isValidating ? t("validating") : t("validate")}
 </button>

 {error && errorScope === "cta" && (
 <div>
 <UserErrorBanner
 surface="article-editor-validate"
 userMessage={error}
 technical={errorApiRawDetail}
 errorCode={errorApiCode}
 detail={errorApiRawDetail}
 >
 {error === t("validateFailed") ? (
 <p className="text-xs">{t("validateFailedHint")}</p>
 ) : null}
 {(error === tArticles("noLlmKey") ||
 error === tArticles("invalidApiKey") ||
 error === tArticles("insufficientCredits") ||
 error === tArticles("needPersona")) && (
 <Link
 href={
 error === tArticles("needPersona") ? "/persona" : "/setup/llm"
 }
 className="text-sm font-semibold underline"
 >
 →{" "}
 {error === tArticles("needPersona")
 ? tArticles("goPersona")
 : tArticles("goLlmSetup")}
 </Link>
 )}
 </UserErrorBanner>
 </div>
 )}
 </div>
 </div>
 )}

 {error && isValidated && (
 <UserErrorBanner
 surface="article-editor"
 userMessage={error}
 errorCode={errorApiCode}
 detail={errorApiRawDetail}
 technical={errorApiRawDetail}
 />
 )}
 </div>
 );
}
